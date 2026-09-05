import { fmt } from './data';
export default function Chart({points,start,end,label,gaps=false}:{points:{day:string;value:number|null}[];start:string;end:string;label:string;gaps?:boolean}) {
 const data=points.filter((p):p is {day:string;value:number}=>p.value!==null);
 if(!data.length)return <p className="ix-empty">この期間に記録がありません。</p>;
 const vals=data.map(p=>p.value),min=Math.min(...vals),max=Math.max(...vals),low=min===max?Math.max(0,min-1):Math.max(0,min-(max-min)*.1),high=min===max?max+1:max+(max-min)*.1;
 const lo=Date.parse(start),hi=Math.max(lo+86400000,Date.parse(end));
 const x=(d:string)=>60+(Date.parse(d)-lo)/(hi-lo)*800,y=(v:number)=>215-(v-low)/(high-low)*170;
 let path='';data.forEach((p,i)=>{path+=(i===0||(gaps&&Date.parse(p.day)-Date.parse(data[i-1].day)>86400000)?'M':'L')+x(p.day)+','+y(p.value)+' ';});
 return <svg className="ix-chart" viewBox="0 0 900 270" role="img" aria-label={label}>
  {[low,(low+high)/2,high].map((v,i)=><g key={i}><line x1="60" x2="860" y1={y(v)} y2={y(v)} stroke="#2c3731"/><text x="50" y={y(v)+5} textAnchor="end" fill="#a5b3aa" fontSize="13">{fmt(Math.round(v))}</text></g>)}
  <path d={path} fill="none" stroke="#a6dfca" strokeWidth="3"/>
  {data.map(p=><circle key={p.day} cx={x(p.day)} cy={y(p.value)} r="4" fill="#a6dfca"><title>{p.day+'：'+fmt(p.value)}</title></circle>)}
  <text x="60" y="251" fill="#a5b3aa" fontSize="14">{start}</text><text x="860" y="251" textAnchor="end" fill="#a5b3aa" fontSize="14">{end}</text>
 </svg>;
}
