import {createServer} from 'vite';
// Frozen-source verification needs no file watcher. Windows recording/profile
// files are actively locked; observing them caused EBUSY in retained V3 evidence.
const server=await createServer({server:{host:'127.0.0.1',port:4173,strictPort:true,watch:null,hmr:false}});
await server.listen();server.printUrls();
for(const signal of ['SIGINT','SIGTERM'])process.once(signal,async()=>{await server.close();process.exit(0);});
