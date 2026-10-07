import json, pathlib, urllib.request, concurrent.futures, math, time
from shapely.geometry import shape, mapping, box
from shapely.ops import unary_union

ROOT = pathlib.Path(__file__).resolve().parents[1]
CACHE = ROOT / '.sites-runtime/map-cache'
CACHE.mkdir(parents=True, exist_ok=True)
def download(code):
    target = CACHE / f'{code}.json'
    if target.exists(): return json.loads(target.read_text())
    url = f'https://geo.datav.aliyun.com/areas_v3/bound/{code}_full.json'
    for attempt in range(3):
        try:
            with urllib.request.urlopen(url, timeout=35) as r: data = json.load(r)
            target.write_text(json.dumps(data)); return data
        except Exception:
            if attempt == 2: raise
            time.sleep(1)

national = download(100000)
provinces = [f for f in national['features'] if isinstance(f['properties'].get('adcode'), int)]
special = {110000,120000,310000,500000,710000,810000,820000}
codes = [f['properties']['adcode'] for f in provinces if f['properties']['adcode'] not in special]
with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
    data = dict(zip(codes, pool.map(download, codes)))

# Albers equal-area projection. All paths and labels use the same projection.
p1,p2 = math.radians(25),math.radians(47)
n = (math.sin(p1)+math.sin(p2))/2
C = math.cos(p1)**2+2*n*math.sin(p1)
rho0 = math.sqrt(C)/n
def project(pt):
    lon, lat = pt[:2]
    rho = math.sqrt(max(0,C-2*n*math.sin(math.radians(lat))))/n
    theta = n*math.radians(lon-105)
    return (rho*math.sin(theta),rho0-rho*math.cos(theta))

raw = []
for p in provinces:
    prop=p['properties']; code=prop['adcode']
    if code == 710000: continue
    for f in ([p] if code in special else data[code]['features']):
        if not f['properties'].get('name'): continue
        fp=f['properties']
        raw.append((str(fp['adcode']),fp['name'],str(code),f['geometry'],fp.get('centroid',fp.get('center'))))

# County/city boundaries supplied by the Taiwan Ministry of the Interior.
twurl='https://raw.githubusercontent.com/titaneric/Taiwan-GeoJSON/master/%E5%8F%B0%E7%81%A3%E9%84%89%E9%8E%AE.json'
try:
    target=CACHE/'taiwan.json'
    if target.exists(): tw=json.loads(target.read_text())
    else:
        with urllib.request.urlopen(twurl,timeout=35) as r: tw=json.load(r)
        target.write_text(json.dumps(tw))
    groups={}
    for f in tw['features']:
        p=f['properties']; full=p.get('名稱','')
        name=p.get('COUNTYNAME') or (full[:3] if full else None)
        code=p.get('COUNTYCODE') or p.get('COUNTYID') or name
        if not name: raise RuntimeError('Missing Taiwan county name')
        groups.setdefault((str(code),name),[]).append(shape(f['geometry']))
    for (code,name), geoms in groups.items():
        raw.append(('tw-'+code,name,'710000',mapping(unary_union(geoms)),None))
except Exception as e:
    raise RuntimeError('Taiwan county boundaries unavailable; do not ship province-only fallback') from e

points=[]
for _,_,_,g,_ in raw:
    geom=shape(g)
    for poly in (list(geom.geoms) if geom.geom_type=='MultiPolygon' else [geom]):
        points.extend(project(pt) for pt in poly.exterior.coords if pt[1]>=18)
minx,maxx=min(x for x,y in points),max(x for x,y in points)
miny,maxy=min(y for x,y in points),max(y for x,y in points)
scale=min(940/(maxx-minx),600/(maxy-miny))
def xy(pt):
    x,y=project(pt); return (round(40+(x-minx)*scale,2),round(38+(maxy-y)*scale,2))
def path(g):
    geom=shape(g).simplify(0.012,preserve_topology=True)
    polys=list(geom.geoms) if geom.geom_type=='MultiPolygon' else [geom]
    chunks=[]; allpts=[]
    for poly in polys:
        for ring in [poly.exterior,*poly.interiors]:
            pts=[xy(p) for p in ring.coords]
            allpts+=pts
            chunks.append('M'+'L'.join(f'{x},{y}' for x,y in pts)+'Z')
    bounds=[min(p[0] for p in allpts),min(p[1] for p in allpts),max(p[0] for p in allpts),max(p[1] for p in allpts)]
    return ''.join(chunks),[round(v,2) for v in bounds]
cities=[]
for code,name,province,g,center in raw:
    d,bounds=path(g)
    rep=shape(g).representative_point()
    # For multi-island areas, representative_point stays inside the region.
    label=xy(center or [rep.x,rep.y])
    cities.append(dict(id=code,name=name,province=province,path=d,center=label,bounds=bounds))
prov=[]
for f in provinces:
    p=f['properties']; d,b=path(f['geometry']); rep=shape(f['geometry']).representative_point()
    prov.append(dict(id=str(p['adcode']),name=p['name'],path=d,center=xy(p.get('centroid',[rep.x,rep.y]))))
inset=[]
for f in national['features']:
    geom=shape(f['geometry'])
    if not geom.is_valid: geom=geom.buffer(0)
    clipped=geom.intersection(box(105,0,125,23))
    if clipped.is_empty or clipped.geom_type not in ['Polygon','MultiPolygon']: continue
    chunks=[]
    for poly in (list(clipped.geoms) if clipped.geom_type=='MultiPolygon' else [clipped]):
        pts=[(round(840+(p[0]-105)*7,2),round(675-p[1]*7,2)) for p in poly.exterior.coords]
        chunks.append('M'+'L'.join(f'{x},{y}' for x,y in pts)+'Z')
    inset.append(dict(path=''.join(chunks),id=str(f['properties'].get('adcode')),name=f['properties'].get('name','')))
out=dict(cities=cities,provinces=prov,inset=inset,width=1020,height=710,source='阿里云 DataV.GeoAtlas；台湾县市界：titaneric/Taiwan-GeoJSON',retrieved='2026-10-07')
(ROOT/'public/map.json').write_text(json.dumps(out,ensure_ascii=False,separators=(',',':')))
(ROOT/'lib/city-index.json').write_text(json.dumps([dict(id=c['id'],name=c['name'],province=c['province']) for c in cities],ensure_ascii=False,separators=(',',':')))
print(json.dumps(dict(cities=len(cities),provinces=len(prov),bytes=(ROOT/'public/map.json').stat().st_size)))
