from pathlib import Path
import hashlib,json,os,subprocess,sys,tempfile,zipfile,shutil,datetime
root=Path(__file__).resolve().parents[2]
source=Path(__file__).resolve().parents[1]
temp=Path(tempfile.mkdtemp(prefix='wm003-browser-'))
(temp/'ffmpeg-1011').mkdir();(temp/'ffmpeg-1011/ffmpeg-linux').symlink_to('/usr/bin/ffmpeg')
archive=Path(os.environ.get('WM_BROWSER_ARCHIVE',str(root/'wm002-publication-replacement/toolchain/chrome-headless-shell-linux64.zip')))
with zipfile.ZipFile(archive) as z:z.extractall(temp)
binary=temp/'chrome-headless-shell-linux64/chrome-headless-shell';binary.chmod(0o755)
assert hashlib.sha256(binary.read_bytes()).hexdigest()=='ded93a9c9a53a1ae040f08124badcca95c938e9d5015ff340c3b5538c41bf39e'
env=os.environ.copy();env.update(WM_CHROMIUM_PATH=str(binary),PLAYWRIGHT_BROWSERS_PATH=str(temp),WM_MEASUREMENT_OUTPUT='evidence/wm-003',WM_MEASUREMENT_LABEL='candidate')
cmd=['node','--experimental-strip-types','scripts/wm003-built-smoke.mjs'] if sys.argv[1:]==['--built'] else ['pnpm','exec','playwright','test',*(sys.argv[1:] or ['e2e/wm003.spec.ts']),'--project=chromium','--workers=1','--reporter=list']
log=temp/'command.log';started=datetime.datetime.now(datetime.timezone.utc).isoformat()
build_cmd=None
with log.open('w') as f:
 if sys.argv[1:]==['--built']:
  dist=temp/'dist';assert not dist.exists();env['WM_DIST_ROOT']=str(dist)
  build_cmd=['pnpm','exec','vite','build','--base=/Webmaster/',f'--outDir={dist}','--emptyOutDir']
  f.write(json.dumps({'freshOutput':str(dist),'existedBeforeBuild':False,'buildCommand':build_cmd})+'\n');f.flush()
  p=subprocess.run(build_cmd,cwd=source,env=env,stdout=f,stderr=subprocess.STDOUT)
  if p.returncode==0:p=subprocess.run(cmd,cwd=source,env=env,stdout=f,stderr=subprocess.STDOUT)
 else:p=subprocess.run(cmd,cwd=source,env=env,stdout=f,stderr=subprocess.STDOUT)
out=source/'evidence/wm-003/attempts';out.mkdir(parents=True,exist_ok=True);stamp=str(len(list(out.glob('*.log')))+1)
shutil.copy2(log,out/f'browser-{stamp}.log');(out/f'browser-{stamp}.json').write_text(json.dumps({'author':'WEBMASTER_IMPLEMENTER','started':started,'command':cmd,'buildCommand':build_cmd,'exit':p.returncode,'browser':'CFT153.0.8010.12','recorder':'system ffmpeg6.1.1, compatibility path shim; not vendor1011 bytes'},indent=2))
print(log.read_text());shutil.rmtree(temp);sys.exit(p.returncode)
