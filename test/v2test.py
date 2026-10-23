import asyncio, json
from playwright.async_api import async_playwright
import os
HERE=os.path.dirname(os.path.abspath(__file__)); DIST=os.path.join(HERE,'..','dist','hexstad.html'); THREE=os.path.join(HERE,'node_modules','three','build','three.min.js'); EMB=os.path.join(HERE,'out','emb.html'); os.makedirs(os.path.join(HERE,'out'),exist_ok=True); os.chdir(os.path.join(HERE,'out'))
src=open(DIST,encoding='utf-8').read().replace('https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js','file://'+THREE).replace('<head>','<head><meta charset="utf-8">',1)
open(EMB,'w',encoding='utf-8').write(src)
# een testhuis: 1 vak, n=4, begane grond met muren rondom de binnenste zeshoek, deur, ramen, trap naar verdieping 1 met vloer en dak
MOD='''(()=>{const m={v:2,id:'test1',name:'Testhuis',cat:'Wonen',k:0,n:4,lv:[{f:{},w:{},s:[],r:{},o:[]},{f:{},w:{},s:[],r:{'0,0':'hip'},o:[]}],edges:[],cells:[],tris:[],paths:[]};
const ts=9/4, P=(i,j)=>[i*ts*Math.sqrt(3)/2,i*ts/2+j*ts];
const inHex=(x,z,rad)=>{for(let k=0;k<6;k++){const a=-k*Math.PI/3;if(x*Math.cos(a)+z*Math.sin(a)>rad)return false;}return true;};
for(let i=-8;i<=8;i++)for(let j=-8;j<=8;j++)for(const t of [0,1]){const A=P(i,j),B=P(i+1,j),C=P(i,j+1),D=P(i+1,j+1);const v=t?[B,D,C]:[A,B,C];const cx=(v[0][0]+v[1][0]+v[2][0])/3,cz=(v[0][1]+v[1][1]+v[2][1])/3;
 if(inHex(cx,cz,7.79)){m.lv[0].f[i+','+j+','+t]='wood'; if(!(cx>1&&cx<4.5&&cz>-1.5&&cz<1.5)) m.lv[1].f[i+','+j+','+t]='carpet';}}
// muren: ribben waarvan beide punten op afstand ~INNER-0.5 .. binnen; simpel: ribben met middelpunt tussen 6.5 en 7.6 van het midden (ring)
const D3=[[1,0],[0,1],[-1,1]];let nw=0;
for(let i=-8;i<=8;i++)for(let j=-8;j<=8;j++)for(let d=0;d<3;d++){const a=P(i,j),b=P(i+D3[d][0],j+D3[d][1]);const mx=(a[0]+b[0])/2,mz=(a[1]+b[1])/2;
 if(inHex(mx,mz,7.5)&&!inHex(mx,mz,6.4)){const o=nw%7===0?'window':nw===3?'door':'';m.lv[0].w[i+','+j+','+d]={m:'brick',o};m.lv[1].w[i+','+j+','+d]={m:'plaster',o:nw%5===0?'window':''};nw++;}}
m.lv[0].s.push({a:[0,-1],d:0,n:2,w:1.2,k:'stair'});
m.lv[0].o.push({t:'bench',x:-3,z:3,rot:0},{t:'lamp',x:3,z:-4,rot:0});
return m;})()'''
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(args=['--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist','--enable-unsafe-swiftshader'])
        pg=await b.new_page(viewport={"width":900,"height":560}); errs=[]
        pg.on('pageerror',lambda e:errs.append(str(e)))
        await pg.goto('file://'+EMB,timeout=120000); await pg.wait_for_timeout(2500)
        await pg.evaluate("()=>window.__SC().doAct('empty')"); await pg.wait_for_timeout(500)
        r=await pg.evaluate("(M)=>{const S=window.__SC(); const m=eval(M); window.__mods.push(m); window.__saveMods(); document.querySelectorAll('.pal-tab')[5].click(); const cs=[...document.querySelectorAll('.modcard')]; const c=cs.find(x=>x.title.startsWith('Testhuis')); c.click(); const ok=S.place(0,0); const c2=S.getCells(); return {ok, inst:(c2.inst||[]).length, walls: window.__modDbg().walls, surf: window.__modDbg().surfaces}}",MOD)
        print(r)
        # loopmodus: speler op (0,-6) naar deur? test floorAt op diverse punten
        fl=await pg.evaluate("()=>{const D=window.__modDbg(); return [[0,0],[0,-5],[3,0],[4.5,0],[-3,3]].map(([x,z])=>[x,z,D.floorAt(x,z,0),D.blockedAt(x,z,0),D.floorAt(x,z,3.1)])}")
        print(fl)
        # lopen: trap op
        await pg.evaluate("()=>{window.__SC().renderer.render=()=>{}; document.getElementById('modeBtn').click()}"); await pg.wait_for_timeout(600)
        await pg.evaluate("()=>{const p=window.__SC().player; p.x=-0.8; p.z=-2.7; p.y=0.05; p.yaw=Math.atan2(-0.866,-0.5);}")
        await pg.keyboard.down('w'); 
        tr=[]
        for i in range(8):
            await pg.wait_for_timeout(350); tr.append(await pg.evaluate("()=>{const p=window.__SC().player; return [+p.x.toFixed(1),+p.z.toFixed(1),+p.y.toFixed(2)]}"))
        await pg.keyboard.up('w'); print('trap',tr)
        # door de muur? richting west vanaf midden
        await pg.evaluate("()=>{const p=window.__SC().player; p.x=0; p.z=0; p.y=0.05; p.yaw=Math.atan2(1,0);}")
        await pg.keyboard.down('w'); await pg.wait_for_timeout(2500); await pg.keyboard.up('w')
        print('muur', await pg.evaluate("()=>{const p=window.__SC().player; return [+p.x.toFixed(1),+p.z.toFixed(1),+p.y.toFixed(2)]}"))
        await pg.screenshot(path='v2walk.png')
        await pg.evaluate("()=>document.getElementById('modeBtn').click()"); await pg.wait_for_timeout(400); print(errs); return
        await pg.evaluate("()=>{const S=window.__SC(); S.orbit.target.set(0,2,0); S.orbit.phi=0.9; S.orbit.dist=42; S.orbit.theta=0.6; S.applyOrbit();}")
        await pg.wait_for_timeout(2500); await pg.screenshot(path='v2a.png')
        await pg.evaluate("()=>{const S=window.__SC(); S.orbit.phi=0.4; S.orbit.dist=30; S.orbit.theta=2.5; S.applyOrbit();}")
        await pg.wait_for_timeout(2000); await pg.screenshot(path='v2b.png')
        print(errs[:3]); await b.close()
asyncio.run(main())
