# Low-poly mensen met bril, baard en glimlach; groeten, praatje, schrikken bij een aanrijding; close-up
import asyncio, os, json
from playwright.async_api import async_playwright
HERE=os.path.dirname(os.path.abspath(__file__)); DIST=os.path.join(HERE,"..","dist","raatstad.html"); THREE=os.path.join(HERE,"node_modules","three","build","three.min.js"); EMB=os.path.join(HERE,"out","emb.html"); open(EMB,"w",encoding="utf-8").write(open(DIST,encoding="utf-8").read().replace("https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js","file://"+THREE).replace("<title>","<meta charset=\"utf-8\"><title>",1)); os.chdir(os.path.join(HERE,'out'))
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(args=['--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist','--enable-unsafe-swiftshader'])
        pg=await b.new_page(viewport={"width":1000,"height":625}); errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)+' | '+str(getattr(e,'stack',''))[:400]))
        await pg.add_init_script("try{localStorage.setItem('raatstad-set',JSON.stringify({terr:'laag',shadow:'zacht',tv:1,res:'normaal'})); localStorage.setItem('raatstad-mensen','1'); localStorage.setItem('raatstad-keys-seen','1'); localStorage.setItem('raatstad.tod',JSON.stringify({tod:14,auto:false,speed:1}))}catch(e){}")
        await pg.goto('file://'+EMB,timeout=120000); await pg.wait_for_timeout(2500)
        await pg.evaluate("()=>window.__SC().doAct('sample')"); await pg.wait_for_timeout(2500)
        # simuleer 90 s en tel groeten / praatjes
        r=await pg.evaluate("()=>{const P=window.__SC().people; let waves=0, chats=0; const seen=new Set(); for(let i=0;i<2700;i++){ P.update(1/30); for(const a of P.agents){ if(a.waveT>1.3&&!seen.has(a.id+'w'+Math.floor(i/30))){waves++; seen.add(a.id+'w'+Math.floor(i/30));} if(a.chatT>0&&a.state==='pause'&&!seen.has(a.id+'c'+Math.floor(i/300))){chats++; seen.add(a.id+'c'+Math.floor(i/300));} } } const A=P.agents; return {n:A.length, waves, chats, bril:A.filter(a=>a.glasses).length, baard:A.filter(a=>a.beard).length}}")
        print('sociaal', json.dumps(r))
        # schrik: iemand 'aanrijden' en kijken wie schrikt
        r2=await pg.evaluate("()=>{const P=window.__SC().people; const a=P.agents.find(x=>x.state==='walk'); const near=P.agents.filter(o=>o!==a&&Math.hypot(o.x-a.x,o.z-a.z)<14&&(o.state==='walk'||o.state==='pause')).length; P.hit(a,3,0); P.update(1/30); const st=P.agents.filter(o=>o.startleT>0).length; return {buren:near, schrikken:st}}")
        print('schrik', json.dumps(r2))
        # close-up van een groet: zet twee mensen tegenover elkaar
        await pg.evaluate("()=>{const P=window.__SC().people; const A=P.agents.filter(x=>x.state==='walk'||x.state==='pause').slice(0,2); const [a,o]=A; Object.assign(a,{x:2,z:2,heading:Math.PI/2,waveT:1.0,smileT:2,lookAt:[3.6,2],state:'pause',timer:5,chatT:5}); Object.assign(o,{x:3.6,z:2,heading:-Math.PI/2,waveT:0.5,smileT:2,lookAt:[2,2],state:'pause',timer:5,chatT:5}); o.glasses=true; a.beard=true; P.update(0.01); const S=window.__SC(); S.orbit.target.set(2.8,1.2,2); S.orbit.dist=5; S.orbit.phi=1.3; S.orbit.theta=0.2; S.applyOrbit();}"); await pg.wait_for_timeout(1500)
        await pg.screenshot(path='mensen_groet.png',timeout=300000)
        print('fouten:',errs[:3]); await b.close()
asyncio.run(main())
