import {build} from 'vite';
// A JS literal avoids Git Bash translating the browser URL into a Windows path.
await build({base:'/Webmaster/wm004-preview/',build:{outDir:'.wm004-pages',emptyOutDir:true,manifest:true}});
