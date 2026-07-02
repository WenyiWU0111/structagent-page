import json, os, re, base64, io, collections
from PIL import Image
BASES={"9B":"/home/admin/wenyi/OSWorld-refactor/results/pyautogui/screenshot/vllm_qwen35-9b_planner_100steps_v5_audit_attribute_memory_v_p_10_boundary_inline",
       "27B":"/home/admin/wenyi/OSWorld-refactor/results/pyautogui/screenshot/vllm_qwen35-27b_planner_100steps_v5_audit_attribute_memory_v_p_10_boundary_inline"}
DL={"chrome":"Chrome","gimp":"GIMP","libreoffice_calc":"Calc","libreoffice_impress":"Impress",
    "libreoffice_writer":"Writer","multi_apps":"Multi-app","os":"OS","thunderbird":"Thunderbird","vlc":"VLC","vs_code":"VS Code"}
IMG_RE=re.compile(r'data:image/png;base64,([A-Za-z0-9+/=]+)')
def cap_from_response(resp):
    resp=(resp or "").strip()
    m=re.search(r'Action:\s*(.+)$', resp, re.DOTALL)
    t=(m.group(1) if m else resp).strip()
    t=re.sub(r'\s+',' ',t)
    return (t[:140].rsplit(' ',1)[0]+'…') if len(t)>140 else t
def trim(t,n):
    t=re.sub(r'\s+',' ',str(t)).strip(); return t if len(t)<=n else t[:n].rsplit(' ',1)[0]+'…'

# candidate pool: solved, 4-10 steps
cands=collections.defaultdict(list)
for bb,base in BASES.items():
    ar=json.load(open(os.path.join(base,"all_result.json")))
    for dom,tasks in ar.items():
        if not isinstance(tasks,dict): continue
        for tid,info in tasks.items():
            if not isinstance(info,dict) or float(info.get("score",0) or 0)<0.999: continue
            d=os.path.join(base,dom,tid)
            jl=os.path.join(d,"traj.jsonl")
            if not os.path.exists(jl): continue
            n=len(open(jl).read().splitlines())
            if 4<=n<=9: cands[dom].append((bb,d,tid,n,info.get("instruction","")))

# curated selection: aim ~14, cover all domains, balance backbones, prefer multi_apps x2
want=[("multi_apps",2),("chrome",2),("libreoffice_calc",2),("libreoffice_impress",1),("libreoffice_writer",1),
      ("gimp",1),("vlc",1),("thunderbird",1),("os",1),("vs_code",1)]
bb_count={"9B":0,"27B":0}
selected=[]
for dom,k in want:
    pool=sorted(cands.get(dom,[]), key=lambda x:(x[3]))  # shorter first
    # try to balance backbones
    pool.sort(key=lambda x: bb_count[x[0]])
    for c in pool:
        if k<=0: break
        selected.append(c); bb_count[c[0]]+=1; k-=1

items=[]; outimg="static/images/traj"
os.makedirs(outimg, exist_ok=True)
for bb,d,tid,n,instr in selected:
    html=open(os.path.join(d,"trajectory.html"),encoding="utf-8",errors="ignore").read()
    imgs=IMG_RE.findall(html)
    if len(imgs)<3: continue
    resps=[json.loads(l).get("response","") for l in open(os.path.join(d,"traj.jsonl")).read().splitlines()]
    m=min(len(imgs), max(len(resps),1)+2, 10)
    sid=tid[:8]; dd=os.path.join(outimg,sid); os.makedirs(dd,exist_ok=True)
    steps=[]
    for i in range(min(len(imgs), len(resps) if resps else len(imgs))):
        if i>=10: break
        try:
            im=Image.open(io.BytesIO(base64.b64decode(imgs[i]))).convert("RGB")
        except Exception: continue
        w=1100; im=im.resize((w, round(im.height*w/im.width)))
        im.save(os.path.join(dd,f"s{i+1}.jpg"), quality=76, optimize=True)
        steps.append({"cap": cap_from_response(resps[i]) if i<len(resps) else f"Step {i+1}"})
    if len(steps)<3: continue
    items.append({"id":sid,"bb":bb,"dom":d.split('/')[-2],"domLabel":DL.get(d.split('/')[-2]),
                  "instr":trim(instr,190),"ok":True,"nsteps":len(steps),"steps":steps})
    print(f"  {sid} {bb:3} {DL.get(d.split('/')[-2]):9} {len(steps)} steps")
json.dump({"items":items}, open("static/data/trajectories_play.json","w"), ensure_ascii=False)
tot=sum(len(i['steps']) for i in items)
print(f"\nextracted {len(items)} playable trajectories, {tot} steps total")
print("img dir size:", os.popen("du -sh static/images/traj").read().strip())
