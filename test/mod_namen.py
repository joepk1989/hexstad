# Modulenamen en bladeren: oude bibliotheek (vorige versie) wordt hernoemd; zoeken, categorieën, maat, , en .
import asyncio, os, json, sys
from playwright.async_api import async_playwright
HERE=os.path.dirname(os.path.abspath(__file__)); DIST=os.path.join(HERE,'..','dist','raatstad.html'); THREE=os.path.join(HERE,'node_modules','three','build','three.min.js'); os.chdir(os.path.join(HERE,'out'))
def emb(src_path, out):
    s=open(src_path,encoding='utf-8').read().replace('https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js','file://'+THREE).replace('<head>','<head><meta charset="utf-8">',1)
    open(out,'w',encoding='utf-8').write(s); return 'file://'+os.path.abspath(out)
OLD=sys.argv[1] if len(sys.argv)>1 else None
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(args=['--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist','--enable-unsafe-swiftshader'])
        ctx=await b.new_context(viewport={"width":1280,"height":760}); pg=await ctx.new_page(); errs=[]
        pg.on('pageerror',lambda e:errs.append(str(e)))
        if OLD:
            await pg.goto(emb(OLD,'emb_old.html'),timeout=120000); await pg.wait_for_timeout(2500)
            print('oud:', await pg.evaluate("()=>JSON.parse(localStorage.getItem('raatstad-modules')).slice(0,4).map(m=>m.name)"))
        await pg.goto(emb(DIST,'emb.html'),timeout=120000); await pg.wait_for_timeout(2500)
        r=await pg.evaluate("""()=>{const M=window.__mods, names=M.map(m=>m.name), dup=names.filter((n,i)=>names.indexOf(n)!==i);
          const cats={}; for(const m of M) cats[m.cat]=(cats[m.cat]||0)+1;
          return {n:M.length, dup, cats, old:names.filter(n=>/Rijtjeshuis|lagen|Bos 7/.test(n)), voorbeeld:names.slice(0,12), alle:names}}""")
        print(json.dumps({k:v for k,v in r.items() if k!='alle'},ensure_ascii=False))
        open('modnamen.txt','w').write('\n'.join(sorted(r['alle'])))
        await pg.evaluate("()=>{const kp=document.getElementById('keysPanel'); if(kp) kp.hidden=true; [...document.querySelectorAll('.pal-tab')].find(t=>t.textContent==='Modules').click()}"); await pg.wait_for_timeout(3000)
        await pg.screenshot(path='mod_palet.png',timeout=300000)
        await pg.keyboard.press('Slash'); await pg.keyboard.type('rij'); await pg.wait_for_timeout(1500)
        print('zoek rij:', await pg.evaluate("()=>[...document.querySelectorAll('.modcard[data-mi]')].map(b=>b.title.split('\\n')[0])"))
        await pg.screenshot(path='mod_zoek.png',timeout=300000)
        await pg.keyboard.press('Enter'); await pg.wait_for_timeout(300)
        await pg.evaluate("()=>{const i=document.getElementById('modSearch'); i.value=''; i.dispatchEvent(new Event('input'))}")
        await pg.evaluate("()=>document.querySelector('[data-sz=\"7\"]').click()"); await pg.wait_for_timeout(1500)
        print('7 vakken:', await pg.evaluate("()=>document.querySelectorAll('.modcard[data-mi]').length"))
        await pg.evaluate("()=>{document.querySelector('[data-sz=\"7\"]').click(); document.querySelector('[data-st=\"1\"]').click()}"); await pg.wait_for_timeout(1000)
        print('plat dak:', await pg.evaluate("()=>document.querySelectorAll('.modcard[data-mi]').length"))
        await pg.evaluate("()=>document.querySelector('[data-st=\"1\"]').click()")
        await pg.evaluate("()=>[...document.querySelectorAll('.mchip')].find(b=>b.textContent.startsWith('Verbindingen')).click()"); await pg.wait_for_timeout(1500)
        await pg.mouse.click(640,300)
        for k in ['Period','Period','Comma']: await pg.keyboard.press(k); await pg.wait_for_timeout(200)
        print('seps', await pg.evaluate("()=>document.querySelectorAll('.modcard-sep').length"), 'kaartjes', await pg.evaluate("()=>document.querySelectorAll('.modcard[data-mi]').length")); print('na . . , :', await pg.evaluate("()=>{const b=document.querySelector('.modcard[aria-pressed=true]'); return b&&b.title.split('\\n')[0]}"))
        await pg.screenshot(path='mod_verbind.png',timeout=300000)
        print('fouten:',errs[:5]); await b.close()
asyncio.run(main())
