import asyncio, os, json
from playwright.async_api import async_playwright
EMB=os.path.join(os.getcwd(),'out','emb.html')
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(args=['--use-gl=swiftshader'])
        pg=await b.new_page(); errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)))
        await pg.goto('file://'+EMB,timeout=120000); await pg.wait_for_timeout(2000)
        cells={"0,0":['heuvel']*3,"1,0":['heuvel']*2,"0,1":['heuvel']}
        print(await pg.evaluate("(c)=>{const S=window.__SC(); S.setCells(c); const m=S.getCells(); m.paths=[{t:'weg',l:0,r:0,p:[[-40,0],[40,0]]}]; S.buildPathNet(); const pr=S.pathProf(m.paths[0]); return {pgN:window.__pgN, pgMax:(()=>{let mx=-9;window.__pg.traverse(o=>{if(o.isMesh){const a=o.geometry.attributes.position.array;for(let i=1;i<a.length;i+=3)mx=Math.max(mx,a[i]);}});return mx})(), inScene:S.scene.children.includes(window.__pg), dbg:(window.__dbgHF||[]).slice(-12), flat:pr.flat, h:pr.h.filter((_,i)=>i%5==0).map(v=>+v.toFixed(1)), live:m.paths.includes(m.paths[0]), t:S.terrainHeightAt(0,0), rt:S.roadTop(0,0,9), ph:S.pathH(m.paths[0],0,0), meshes:(()=>{const out=[];S.scene.traverse(o=>{if(o.isMesh&&o.material&&o.material.polygonOffset){const a=o.geometry.attributes.position.array;let mx=-1;for(let i=1;i<a.length;i+=3)mx=Math.max(mx,a[i]);out.push([o.material.color.getHexString(),a.length/3,+mx.toFixed(2)]);}});return out.slice(0,30)})(), maxY:(()=>{let mx=-1;S.scene.traverse(o=>{if(o.isMesh&&o.geometry&&o.geometry.attributes.position&&o.material&&o.material.polygonOffset){const a=o.geometry.attributes.position.array;for(let i=1;i<a.length;i+=3)mx=Math.max(mx,a[i]);}});return mx})()}}",cells))
        print(errs); await b.close()
asyncio.run(main())
