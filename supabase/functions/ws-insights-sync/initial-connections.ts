// Only first-time connections. Explicit disconnects and prior failures need owner action.
export function canReuseConnection(account:any, connection:any) {
 return ['instagram','threads'].includes(account.channel)
  && account.status==='needs_connection' && !account.last_attempt_at && !account.auto_enabled
  && connection?.channel===account.channel && connection.status==='connected'
  && typeof account.handle==='string' && account.handle.length>0
  && typeof connection.handle==='string' && account.handle.toLowerCase()===connection.handle.toLowerCase();
}
export async function reuseInitialConnections(accounts:any[],connections:any[],io:any) {
 const outcomes:Record<string,unknown>={};
 for(const account of accounts){
  if(!canReuseConnection(account,connections.find(c=>c.channel===account.channel)))continue;
  try {
   const existing=await io.existing(account.channel);
   const token=existing||await io.shared(account.channel);if(typeof token!=='string'||token.length<20)continue;
   const measurement=await io.measure(account,token);
   if(typeof measurement.handle!=='string'||measurement.handle.toLowerCase()!==account.handle.toLowerCase())throw new Error('account_mismatch');
   if(!existing)await io.saveToken(account.channel,token);
   await io.saveMeasurement(account,measurement);
   outcomes[account.channel]={ok:true,followers:measurement.followers};
  } catch(error) { outcomes[account.channel]=await io.failure(account,error); }
 }
 return outcomes;
}
