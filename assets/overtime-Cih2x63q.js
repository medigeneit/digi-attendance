const u=n=>{const r=Number(n);if(!Number.isFinite(r)||r<=0)return"-";const t=Math.floor(r),o=Math.round((r-t)*60);return o>=60?`${t+1}h`:o?`${t}h ${o}m`:`${t}h`};export{u as f};
