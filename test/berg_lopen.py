import asyncio, os, json
from playwright.async_api import async_playwright
HERE=os.path.dirname(os.path.abspath(__file__)); EMB=os.path.join(HERE,'out','emb.html'); os.chdir(os.path.join(HERE,'out'))
cells={}
for q in range(-6,7):
    for r in range(-6,7):
        d=max(abs(q),abs(r),abs(-q-r)); n=5-d
        if n>0: cells[f"{q},{r}"]=['heuvel']*n
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(args=['--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist','--enable-unsafe-swiftshader'])
        pg=await b.new_page(viewport={"width":900,"height":560}); errs=[]
        pg.on('pageerror',lambda e:errs.append(str(e)))
        await pg.goto('file://'+EMB,timeout=120000); await pg.wait_for_timeout(2500)
        t=await pg.evaluate("(c)=>{const S=window.__SC(); const t0=performance.now(); S.setCells(c); const m=S.getCells(); m.paths=[{t:'weg',l:0,r:0,p:[[-110,0],[110,0]]}]; S.buildPathNet(); return performance.now()-t0}",cells); print('opbouw ms',round(t))
        await pg.evaluate("()=>{window.__SC().renderer.render=()=>{}; document.getElementById('modeBtn').click()}"); await pg.wait_for_timeout(500)
        for label,(x,z,yaw) in {'weg':(-100,-1.2,-1.5708),'gras':(-100,-12,-1.5708)}.items():
            await pg.evaluate("([x,z,yaw])=>{const p=window.__SC().player; p.x=x; p.z=z; p.y=0.2; p.yaw=yaw;}",[x,z,yaw])
            await pg.keyboard.down('ShiftLeft'); await pg.keyboard.down('w'); tr=[]
            for i in range(16):
                await pg.wait_for_timeout(900); tr.append(await pg.evaluate("()=>{const p=window.__SC().player; return [+p.x.toFixed(0),+p.y.toFixed(1)]}"))
            await pg.keyboard.up('w'); await pg.keyboard.up('ShiftLeft'); print(label,tr)
        r=await pg.evaluate("()=>{const S=window.__SC(); return [-40,-20,0,20].map(x=>[x, +S.terrainHeightAt(x,-1).toFixed(1), S.roadTop(x,-1.2,30)])}"); print(r)
        await pg.evaluate("()=>{const S=window.__SC(); const t0=performance.now(); document.querySelector('[data-act=ring]').click(); window.__t=performance.now()-t0;}"); await pg.wait_for_timeout(500)
        print('ringstad ms', round(await pg.evaluate("()=>window.__t")))
        print(errs[:3]); await b.close()
asyncio.run(main())
