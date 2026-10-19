const {test}=require('node:test');const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript'),path=require('node:path');
test('chat refreshes on message/reconnect, reports disconnection once and stops after cleanup',()=>{
 const handlers={};let updates=0,errors=0,removed=0;
 const channel={on(type,filter,fn){assert.equal(type,'postgres_changes');assert.equal(filter.table,'online_message');handlers.message=fn;return this;},subscribe(fn){handlers.status=fn;return this;}};
 const client={channel:()=>channel,removeChannel:async()=>{removed++;}};
 const exports={};const source=fs.readFileSync(path.join(__dirname,'../src/online/operations.ts'),'utf8');
 vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,require:name=>name==='@startup/contracts'?{uuidSchema:{parse:id=>id}}:{}});
 const stop=exports.subscribeOnlineMessages(client,'00000000-0000-4000-8000-000000000001',()=>updates++,()=>errors++);
 handlers.status('SUBSCRIBED');handlers.message();assert.equal(updates,2);
 handlers.status('CHANNEL_ERROR');handlers.status('TIMED_OUT');assert.equal(errors,1);
 handlers.status('SUBSCRIBED');assert.equal(updates,3);
 stop();handlers.message();handlers.status('SUBSCRIBED');assert.equal(updates,3);assert.equal(removed,1);
});
