# Voetgangers snel doorrekenen zonder te tekenen (people.update in een lus): ongelukjes-tellers en wie lang vaststaat
import asyncio, os, json, sys
from playwright.async_api import async_playwright
HERE=os.path.dirname(os.path.abspath(__file__)); DIST=os.path.join(HERE,"..","dist","hexstad.html"); THREE=os.path.join(HERE,"node_modules","three","build","three.min.js"); EMB=os.path.join(HERE,"out","emb.html"); open(EMB,"w",encoding="utf-8").write(open(DIST,encoding="utf-8").read().replace("https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js","file://"+THREE).replace("<head>","<head><meta charset=\"utf-8\">",1)); os.chdir(os.path.join(HERE,'out'))
SEC=int(sys.argv[1]) if len(sys.argv)>1 else 120
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(args=['--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist','--enable-unsafe-swiftshader'])
        pg=await b.new_page(viewport={"width":400,"height":300}); errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)))
        await pg.add_init_script("try{localStorage.setItem('hexstad-set',JSON.stringify({terr:'laag',shadow:'uit',tv:1,res:'snel'})); localStorage.setItem('hexstad-mensen','1')}catch(e){}")
        await pg.goto('file://'+EMB,timeout=120000); await pg.wait_for_timeout(2500)
        for act in ['mall','sample']:
            await pg.evaluate("(a)=>{const kp=document.getElementById('keysPanel'); if(kp) kp.hidden=true; document.getElementById('menuBtn').click(); document.querySelector('[data-act='+a+']').click()}",act); await pg.wait_for_timeout(3000)
            await pg.evaluate("()=>{const I=window.__INC; for(const k in I.counts) I.counts[k]=0; I.list.length=0; I.dbg=1; window.__SC().people.update(0.01);}")
            hist=[]
            for t in range(0,SEC,10):
                await pg.evaluate("()=>{const P=window.__SC().people; for(let i=0;i<300;i++) P.update(1/30);}")
                hist.append(await pg.evaluate("()=>window.__SC().people.agents.map(a=>[+a.x.toFixed(2),+a.z.toFixed(2),a.state,+a.y.toFixed(1),a.prev&&a.prev.key,a.node&&a.node.key,(a.wps||[]).map(p=>p.map(v=>+v.toFixed(1))),+(a.blockT||0).toFixed(1),a.prog&&+a.prog.t.toFixed(1),+(a.spd||0).toFixed(2),a.lastWS])"))
            # vast: in de laatste 30 s minder dan 1 m verplaatst en steeds 'walk'
            stuck=[]
            if len(hist)>=4:
                A,B=hist[-4],hist[-1]
                for i,(a,b2) in enumerate(zip(A,B)):
                    if all(h[i][2]=='walk' for h in hist[-4:]) and ((a[0]-b2[0])**2+(a[1]-b2[1])**2)**0.5<1: stuck.append(b2[:2] if len(sys.argv)<3 else b2)
            r=await pg.evaluate("()=>{const I=window.__INC; return {n:window.__SC().people.agents.length, counts:I.counts, laatste:I.list.slice(0,4).map(e=>[e.kind,+e.x.toFixed(1),+e.y.toFixed(1),+e.z.toFixed(1),e.detail.slice(0,700)])}}")
            r['vast']=len(stuck); r['vast_vb']=stuck[:6]
            print(act, json.dumps(r))
        print('fouten:',errs[:3]); await b.close()
asyncio.run(main())
