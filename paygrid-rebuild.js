(() => {
  'use strict';
  const CATEGORIES = ["MANDATORY", "T/A", "T/A", "T/A", "T/A", "T/A", "T/A", "T/A", "T/A", "EARNINGS", "EARNINGS", "EARNINGS", "EARNINGS", "EARNINGS", "EARNINGS", "EARNINGS", "EARNINGS", "EARNINGS", "EARNINGS", "EARNINGS", "EARNINGS", "EARNINGS", "EARNINGS", "EARNINGS", "EARNINGS", "EARNINGS", "EARNINGS", "EARNINGS", "EARNINGS", "EARNINGS", "EARNINGS", "EARNINGS", "EARNINGS", "EARNINGS", "EARNINGS", "EARNINGS", "EARNINGS", "EARNINGS", "EARNINGS", "EARNINGS", "EARNINGS", "EARNINGS", "EARNINGS", "EARNINGS", "EARNINGS", "EARNINGS", "EARNINGS", "REIMBURSEMENTS", "REIMBURSEMENTS", "REIMBURSEMENTS", "REIMBURSEMENTS", "REIMBURSEMENTS", "REIMBURSEMENTS", "REIMBURSEMENTS", "GROSS PAYMENT", "DEDUCTIONS", "DEDUCTIONS", "DEDUCTIONS", "DEDUCTIONS", "DEDUCTIONS", "DEDUCTIONS", "DEDUCTIONS", "DEDUCTIONS", "DEDUCTIONS", "DEDUCTIONS", "DEDUCTIONS", "DEDUCTIONS", "DEDUCTIONS", "DEDUCTIONS", "DEDUCTIONS", "DEDUCTIONS", "DEDUCTIONS", "DEDUCTIONS", "DEDUCTIONS", "DEDUCTIONS", "DEDUCTIONS", "DEDUCTIONS", "DEDUCTIONS", "DEDUCTIONS", "DEDUCTIONS", "DEDUCTIONS", "DEDUCTIONS", "DEDUCTIONS", "DEDUCTIONS", "DEDUCTIONS", "DEDUCTIONS", "DEDUCTIONS", "DEDUCTIONS", "DEDUCTIONS", "DEDUCTIONS", "DEDUCTIONS", "DEDUCTIONS", "DEDUCTIONS", "DEDUCTIONS", "DEDUCTIONS", "DEDUCTIONS", "DEDUCTIONS", "DEDUCTIONS", "DEDUCTIONS", "DEDUCTIONS", "DEDUCTIONS", "NETT SALARY", "FRINGE BENEFITS", "FRINGE BENEFITS", "FRINGE BENEFITS", "FRINGE BENEFITS", "FRINGE BENEFITS", "FRINGE BENEFITS", "FRINGE BENEFITS", "COMPANY CONTRIBUTIONS", "COMPANY CONTRIBUTIONS", "COMPANY CONTRIBUTIONS", "COMPANY CONTRIBUTIONS", "COMPANY CONTRIBUTIONS", "COMPANY CONTRIBUTIONS", "COMPANY CONTRIBUTIONS", "COMPANY CONTRIBUTIONS", "COMPANY CONTRIBUTIONS", "COMPANY CONTRIBUTIONS", "COMPANY CONTRIBUTIONS", "COMPANY CONTRIBUTIONS", "COMPANY CONTRIBUTIONS", "COMPANY CONTRIBUTIONS", "COMPANY CONTRIBUTIONS", "COMPANY CONTRIBUTIONS", "COMPANY CONTRIBUTIONS", "COST TO COMPANY", "XPAYLO", "XPAYLO", "XPAYLO", "XPAYLO", "XPAYLO", "XPAYLO", "XPAYLO"];
  const HEADERS = ["EMP Name", "Normal", "Sunday", "Off Day", "Overtime", "Overtime 2", "Holiday", "Nightshift", "Total Hours", "PAY RATE", "NORMAL PAY", "SUNDAY PAY", "E-REFUND NON-TAXABLE", "OVERTIME", "PUBLIC HOLIDAY", "NIGHT SHIFT PAY", "TOTAL PAY", "E-UNPAID LEAVE", "E-OVERTIME MANUAL", "E-COMMISION", "E-ONCE OFF COMMISSION", "E-ANNUAL BONUS", "E-LEAVE PAYOUT", "E-BACK PAY", "E-UNIF ALLOWANCE", "E-COMPUTER ALLOWANCE", "E-SANLAM CORRECTION", "E-GROCERY ALLOWANCE", "E-CASUAL WAGES", "E-CASHIER ALLOWANCE", "E-SALARY OVERPAID (-)", "E-SALARY SHORT PAID", "E-SPAR2U TIPS", "E-LEARNER STIPENDS", "E-BACKPAY", "E-REFUND", "E-SHARE OPTIONS", "E-MEDICAL AID ALLOWANCE", "E-EXEMPT POLICY PROCEEDS", "E-LOAN PAYMENT", "E-INCENTIVE", "E-NOTICE PAY", "E-TAKE ON DEDUCTION (-)", "E-TAKE ON EARNING", "E-TILL SHORTAGE REFUND NEGATIVE", "E-SNR CASHIER ALLOWANCE", "Total Earnings", "R-TRAVEL ALLOWANCE", "R-TRAVEL REIMBURSEMENT", "R-EXPENSE CLAIM (NON TAXABLE)", "R-SUBS ALLOWANCE LOCAL", "R-SUBS ALLOWANCE INTERNATIONAL", "R-EXPENSE CLAIM", "Total Reimbursements", "Total Gross Payment", "D-SARS ITA88", "D-GROCERY EXCESS", "D-GROCERY ALLOWANCE DEDUCTION", "D-SAFE SHORTS DEDUCTION", "D-PETROL EXCESS DEDUCTION", "D-NOTICE PAY DEDUCTION", "D-PROVIDENT R&A RISK CALC", "D-3PTY", "D-CIKISWA LOBESE", "D-MAGISTRATE", "D-J.P. MCGLASHAN", "D-J.P. MCGLASHAN WATER", "D-FUNERAL R&A EXT FAMILY", "\tD-SANLAM G July", "D-OTHER RECOVERY LOAN", "D-STAFF MEALS", "D-SANLAM (G-4000)", "D-SANLAM (G-1500)", "D-SANLAM (G-500)", "D-SANLAM (G-1000)", "D-TILL SHORTAGE", "D-MAINTENANCE ORDER", "D-GARNISHEE", "UIF", "D-ADVANCE", "D-LOAN", "D-UNIFORM 1", "D-UNIFORM 2", "D-STAFF LOAN", "D-OTHER RECOVERY", "D-TILL SHORTAGES LOAN", "D-UNION", "D-R&A FUNERAL", "D-R&A AVBOB", "D-R&A", "D-SANLAM (G-3000)", "D-SANLAM", "D-RETIREMENT ANNUITY", "D-MEDICAL", "D-PENSION", "D-DONATIONS", "D-FUNERAL DEDUCTION", "D-CASHIER DEDUCTION", "PAYE", "D-VOLUNTARY OVER DEDUCTION", "Total Deductions/Contributions", "Nett Salary", "FB-GAP COVER", "FB-MEDICAL (DO NOT USE)", "FB-RELEASE FROM DEBIT", "FB-USE OF AN ASSET", "FB-ACCOMMODATION BENEFIT", "FB-INTEREST ON LOAN", "Total Fringe Benefits", "CC-PROVIDENT R&A", "CC-PROV FUND R&A AVBOB", "CC-PROVIDENT R&A FUNERAL", "CC-SANLAM (G-3000)", "CC-SANLAM", "\tD-SANLAM G July", "CC-SANLAM (G-4000)", "CC-SANLAM (G-1500)", "CC-SANLAM (G-500)", "CC-SANLAM (G-1000)", "SDL", "UIF", "CC-MEDICAL", "CC-UNION", "CC-PENSION", "CC-RETIREMENT ANNUITY", "Total Company Contributions", "Cost to Company", "XPaylo YTD Taxable Earnings", "XPaylo YTD Perks", "XPaylo YTD Tax", "XPaylo Leave Annual", "XPaylo Leave Grace", "XPaylo Leave Access", "XPaylo Leave Days Due"];
  const byId = id => document.getElementById(id);
  const money = v => Number.isFinite(v) ? v.toLocaleString('en-ZA', {minimumFractionDigits:2, maximumFractionDigits:2}) : '####';
  const norm = v => String(v ?? '').replace(/\s+/g,' ').trim().toUpperCase();
  const compact = v => norm(v).replace(/[^A-Z0-9]/g,'');
  const cleanKey = v => norm(v).replace(/^([ERD]|CC|FB)-/,'').replace(/[^A-Z0-9]/g,'');
  const num = v => {
    if (v == null) return null;
    let s=String(v).trim().replace(/\s+/g,'');
    if(!s)return null;
    if (/^-?\d+,\d{1,2}$/.test(s)) s=s.replace(',','.'); else s=s.replace(/,/g,'');
    const n=Number(s); return Number.isFinite(n)?n:null;
  };
  function status(id,msg,kind='neutral'){const e=byId(id); if(!e)return; e.textContent=msg; e.className=`status ${kind}`;}
  function latin1(bytes){let out=''; const step=0x8000; for(let i=0;i<bytes.length;i+=step) out+=String.fromCharCode(...bytes.subarray(i,i+step)); return out;}
  function findObjects(bytes){
    const s=latin1(bytes), re=/(\d+)\s+(\d+)\s+obj\b/g, starts=[]; let m;
    while((m=re.exec(s))) starts.push({id:Number(m[1]), gen:Number(m[2]), start:m.index, bodyStart:re.lastIndex});
    const map=new Map();
    for(let i=0;i<starts.length;i++){
      const st=starts[i], end=s.indexOf('endobj',st.bodyStart); if(end<0) continue;
      const body=s.slice(st.bodyStart,end); map.set(st.id,{...st,end,body});
    }
    return {s,map};
  }
  function orderedPageIds(map){
    let catalog=null; for(const [id,o] of map) if(/\/Type\s*\/Catalog\b/.test(o.body)){catalog=id;break;}
    let root=null; if(catalog){const m=map.get(catalog).body.match(/\/Pages\s+(\d+)\s+\d+\s+R/); if(m)root=Number(m[1]);}
    const out=[];
    const walk=id=>{const o=map.get(id); if(!o)return; if(/\/Type\s*\/Page(?!s)\b/.test(o.body)){out.push(id);return;} const km=o.body.match(/\/Kids\s*\[([\s\S]*?)\]/); if(km){for(const rm of km[1].matchAll(/(\d+)\s+\d+\s+R/g))walk(Number(rm[1]));}};
    if(root) walk(root);
    if(!out.length) for(const [id,o] of map) if(/\/Type\s*\/Page(?!s)\b/.test(o.body)) out.push(id);
    return out;
  }
  function streamBytes(bytes, parsed, obj){
    const local=obj.body, pos=local.indexOf('stream'); if(pos<0)return null;
    let abs=obj.bodyStart+pos+6; if(bytes[abs]===13&&bytes[abs+1]===10)abs+=2; else if(bytes[abs]===10||bytes[abs]===13)abs+=1;
    let len=null; const lm=local.slice(0,pos).match(/\/Length\s+(\d+)\b/); if(lm)len=Number(lm[1]);
    let raw;
    if(Number.isFinite(len)) raw=bytes.slice(abs,abs+len); else {const e=parsed.s.indexOf('endstream',abs); raw=bytes.slice(abs,e);}
    if(/\/FlateDecode/.test(local.slice(0,pos))){
      if(typeof pako==='undefined') throw new Error('PDF decompressor is unavailable.');
      try{return pako.inflate(raw);}catch(e){try{return pako.inflateRaw(raw);}catch(_){throw new Error('A PDF content stream could not be decompressed.');}}
    }
    return raw;
  }
  function pdfString(src,i){
    let out='', depth=1; i++;
    for(;i<src.length;i++){const c=src[i]; if(c==='\\'){const n=src[++i]; if(n==='n')out+='\n'; else if(n==='r')out+='\r'; else if(n==='t')out+='\t'; else if(n==='b')out+='\b'; else if(n==='f')out+='\f'; else if(/[0-7]/.test(n)){let oct=n; for(let k=0;k<2 && /[0-7]/.test(src[i+1]||'');k++)oct+=src[++i]; out+=String.fromCharCode(parseInt(oct,8));} else if(n==='\r'&&src[i+1]==='\n')i++; else if(n==='\n'||n==='\r'){} else out+=n; continue;} if(c==='('){depth++;out+=c;continue;} if(c===')'){depth--;if(depth===0)return [out,i+1];out+=c;continue;} out+=c;}
    return [out,i];
  }
  function tokenize(src){
    const tokens=[]; let i=0;
    const ws=c=>/\s/.test(c);
    while(i<src.length){let c=src[i]; if(ws(c)){i++;continue;} if(c==='%'){while(i<src.length&&!/[\r\n]/.test(src[i]))i++;continue;}
      if(c==='('){const [v,n]=pdfString(src,i);tokens.push({t:'str',v});i=n;continue;}
      if(c==='['){const start=i++; let depth=1, arr=[]; while(i<src.length&&depth){c=src[i]; if(ws(c)){i++;continue;} if(c==='('){const [v,n]=pdfString(src,i);arr.push({t:'str',v});i=n;continue;} if(c==='['){depth++;i++;continue;} if(c===']'){depth--;i++;continue;} let j=i; while(j<src.length&&!ws(src[j])&&!['[',']','(',')'].includes(src[j]))j++; const w=src.slice(i,j); const n=Number(w); arr.push(Number.isFinite(n)?{t:'num',v:n}:{t:'word',v:w}); i=j; } tokens.push({t:'arr',v:arr}); continue;}
      if(c==='<'){if(src[i+1]==='<'){tokens.push({t:'word',v:'<<'});i+=2;continue;} let j=src.indexOf('>',i+1); if(j<0)j=src.length; let h=src.slice(i+1,j).replace(/\s/g,''); if(h.length%2)h+='0'; let out=''; for(let k=0;k<h.length;k+=2)out+=String.fromCharCode(parseInt(h.slice(k,k+2),16)||0); tokens.push({t:'str',v:out});i=j+1;continue;}
      let j=i; while(j<src.length&&!ws(src[j])&&!['[',']','(',')','<','>'].includes(src[j]))j++; const w=src.slice(i,j); if(!w){i++;continue;} const n=Number(w); tokens.push(Number.isFinite(n)?{t:'num',v:n}:{t:'word',v:w}); i=j;
    } return tokens;
  }
  function contentItems(content){
    const src=latin1(content), toks=tokenize(src), items=[]; let stack=[], inText=false, x=0,y=0,seq=0;
    const ops=new Set(['BT','ET','Tm','Td','TD','T*','Tf','Tj','TJ',"'",'"','cm','q','Q','re','m','l','S','f','b','W','n','rg','RG','sc','w','J']);
    function emit(v){v=String(v||'').replace(/\0/g,'').replace(/\s+/g,' '); if(v.trim())items.push({x,y,text:v,seq:seq++});}
    for(const t of toks){if(t.t==='word'&&ops.has(t.v)){const op=t.v, a=stack; stack=[]; if(op==='BT'){inText=true;x=0;y=0;} else if(op==='ET')inText=false; else if(inText&&op==='Tm'&&a.length>=6){x=Number(a[a.length-2].v)||0;y=Number(a[a.length-1].v)||0;} else if(inText&&(op==='Td'||op==='TD')&&a.length>=2){x+=Number(a[a.length-2].v)||0;y+=Number(a[a.length-1].v)||0;} else if(inText&&op==='Tj'&&a.length)emit(a[a.length-1].v); else if(inText&&op==='TJ'&&a.length){const ar=a[a.length-1].v||[];emit(ar.filter(z=>z.t==='str').map(z=>z.v).join(''));} else if(inText&&op==="'"&&a.length)emit(a[a.length-1].v); else if(inText&&op==='"'&&a.length)emit(a[a.length-1].v); continue;} stack.push(t);}
    return items;
  }
  function pageItems(bytes, parsed, pageId){
    const p=parsed.map.get(pageId); const refs=[]; let m=p.body.match(/\/Contents\s*\[([\s\S]*?)\]/); if(m)for(const r of m[1].matchAll(/(\d+)\s+\d+\s+R/g))refs.push(Number(r[1])); else {m=p.body.match(/\/Contents\s+(\d+)\s+\d+\s+R/);if(m)refs.push(Number(m[1]));}
    const all=[]; for(const id of refs){const o=parsed.map.get(id); if(!o)continue; const b=streamBytes(bytes,parsed,o); if(b)all.push(...contentItems(b));} return all;
  }
  function linesFromItems(items){
    const lines=[]; for(const it of items){let line=lines.find(l=>Math.abs(l.y-it.y)<=1.8); if(!line){line={y:it.y,items:[]};lines.push(line);} line.items.push(it);}
    for(const l of lines){
      l.items.sort((a,b)=>a.x-b.x||a.seq-b.seq);
      let out='',prev=null;
      for(const it of l.items){const original=String(it.text||''); const t=original.trim(); if(!t)continue; let sep=' '; if(prev&&Math.abs(prev.x-it.x)<0.75){const prevRaw=String(prev.text||''); sep=(/^\s/.test(original)||/\s$/.test(prevRaw))?' ':'';} if(!out)sep=''; out+=sep+t; prev=it;}
      l.text=out.replace(/\s+/g,' ').trim();
    }
    return lines.sort((a,b)=>b.y-a.y);
  }
  function nearestValue(items,label,xMin=0){
    const labelKey=compact(label); const l=items.find(i=>compact(i.text)===labelKey); if(!l)return null;
    const textKey=compact(l.text); const li=textKey.indexOf(labelKey); if(li>=0&&compact(l.text)===labelKey){const m=String(l.text).match(/(-?[\d][\d ,.]*[\d]|-?\d+(?:[.,]\d+)?)/); if(m){const inline=num(m[1]);if(inline!=null)return inline;}}
    const cand=items.filter(i=>i.x>=Math.max(xMin,l.x)&&Math.abs(i.y-l.y)<3&&num(i.text)!=null).sort((a,b)=>a.x-b.x);
    return cand.length?num(cand[0].text):null;
  }
  const FIELD_LABELS = [
    'Co. Name','Co. Address','Period EndDate','Printed Date','Pay slip','Payment Dt',
    'Employee Code','Employee Name','Employee Address','Department','Job Title','Date Engaged',
    'Account Number','Branch Code','ID Number','Tax Number','Contact Person','Contact Email',
    'Contact Number','Bank'
  ];
  const fieldLabelPattern=FIELD_LABELS.map(v=>v.replace(/[.*+?^${}()|[\]\\]/g,'\\$&').replace(/\\ /g,'\\s*')).join('|');
  const nextLabel=new RegExp('\\s+(?:'+fieldLabelPattern+')\\s*:?', 'i');
  function fieldFromLines(lines,label){
    for(const l of lines){
      const t=l.text; const i=norm(t).indexOf(norm(label));
      if(i<0)continue;
      let v=t.slice(i+String(label).length).replace(/^\s*:?\s*/,'').trim();
      const cut=v.search(nextLabel); if(cut>=0)v=v.slice(0,cut).trim();
      if(v)return v;
    }
    return null;
  }
  function cleanIdentityText(value){
    let v=String(value||'').replace(/\s+/g,' ').trim();
    if(!v)return '';
    const cut=v.search(nextLabel); if(cut>=0)v=v.slice(0,cut).trim();
    return v.replace(/^[:\-\s]+|[:\-\s]+$/g,'').trim();
  }
  function cleanEmployeeCode(value){
    const v=cleanIdentityText(value).toUpperCase();
    if(!v)return '';
    // Employee codes in the source grids are compact alphanumeric identifiers.
    // Take only the first valid identifier so adjacent PDF columns can never bleed into EMP Name.
    const m=v.match(/^[A-Z0-9][A-Z0-9._\/-]{2,24}/);
    return m?m[0]:'';
  }
  function cleanEmployeeName(value){
    let v=cleanIdentityText(value);
    if(!v)return '';
    // Defensive stop for PDFs that flatten the right-hand contact panel onto the same text line.
    v=v.replace(/\s+(?:CONTACT\s+(?:PERSON|EMAIL|NUMBER)|DEPARTMENT|BANK|ACCOUNT\s+NUMBER|BRANCH\s+CODE)\s*:.*$/i,'').trim();
    return v;
  }
  function periodDate(lines){for(const l of lines){let m=l.text.match(/(?:Pay slip|Period EndDate)\s*:?[ ]*(\d{1,2}[ -][A-Za-z]{3}[ -]\d{4})/i); if(m)return m[1];}return null;}
  function dateInfo(s){if(!s)return {month:'',year:'',taxYear:''}; const m=s.match(/(\d{1,2})[ -]([A-Za-z]{3})[ -](\d{4})/); if(!m)return {month:'',year:'',taxYear:''}; const d=new Date(`${m[2]} ${m[1]}, ${m[3]}`); const month=d.toLocaleString('en',{month:'long'}); const y=Number(m[3]); return {month,year:y,taxYear:d.getMonth()+1>=2?y+1:y};}
  const SECTION_BOUNDARIES=['EARNINGS','DEDUCTIONS','COMPANY CONTRIBUTIONS','Nett Pay:','YEAR-TO-DATE TOTALS','LEAVE DETAILS','CLOCKED HOURS','Normal Pay Breakdown','Employee Balances'];
  function section(lines,name,nextNames=[]){
    const start=lines.findIndex(l=>compact(l.text).startsWith(compact(name)));
    if(start<0)return [];
    let end=lines.length;
    const boundaries=[...new Set([...SECTION_BOUNDARIES,...nextNames])].filter(v=>compact(v)!==compact(name));
    for(const nn of boundaries){
      const j=lines.findIndex((l,i)=>i>start&&compact(l.text).startsWith(compact(nn)));
      if(j>=0&&j<end)end=j;
    }
    return lines.slice(start+1,end);
  }
  function rightNumber(line,xMin=0,xMax=1e9){const cs=line.items.filter(i=>i.x>=xMin&&i.x<=xMax&&num(i.text)!=null).sort((a,b)=>b.x-a.x); return cs.length?num(cs[0].text):null;}
  function leftDescription(line,xMax=380){return line.items.filter(i=>i.x<xMax&&num(i.text)==null).map(i=>i.text.trim()).join(' ').replace(/\s+/g,' ').trim();}
  const ranges={earn:[10,46],reim:[47,53],ded:[55,100],fb:[102,108],cc:[109,125]};
  const extraIndex={
    ytdTaxable:127,ytdPerks:128,ytdTax:129,
    leaveAnnual:130,leaveGrace:131,leaveAccess:132,leaveDue:133
  };
  const PAYSLIP_KEY_ALIASES={
    'LOANUNIFORM1':'UNIFORM1',
    'LOANUNIFORM2':'UNIFORM2',
    'DLOANUNIFORM1':'UNIFORM1',
    'DLOANUNIFORM2':'UNIFORM2'
  };
  function deductionKey(value){
    // D- is the Pay Grid category prefix for a deduction, not part of the
    // human-readable payslip description. Normalize both sides without it.
    let v=norm(value).replace(/^D\s*-\s*/,'');
    let k=v.replace(/[^A-Z0-9]/g,'');
    k=PAYSLIP_KEY_ALIASES[k]||k;
    return k;
  }
  function rangeKey(value,range){
    if(range===ranges.ded)return deductionKey(value);
    let k=cleanKey(value);
    k=PAYSLIP_KEY_ALIASES[k]||k;
    return k;
  }
  function mapRange(desc,range){
    const k=rangeKey(desc,range);
    let exact=null;
    for(let i=range[0];i<=range[1];i++){
      const hk=rangeKey(HEADERS[i],range);
      if(hk===k)exact=i;
    }
    return exact;
  }
  function lineDescriptionForMapping(line){
    const positioned=leftDescription(line);
    if(positioned)return positioned;
    return String(line?.text||'').trim();
  }
  function stripTrailingPrintedValues(text){
    let out=String(text||'').replace(/\s+/g,' ').trim();
    // Some payroll PDFs flatten a complete row into one text object, e.g.
    // "OTHER RECOVERY 524.88" or "NORMAL PAY 176.87 14,000.00".
    // Remove only trailing decimal-form payroll values so digits that are part
    // of a real description (UNIFORM 1, 3PTY, SANLAM G-4000) stay intact.
    for(let n=0;n<3;n++){
      const next=out.replace(/\s+-?\d[\d,]*[.,]\d{1,2}\s*$/,'').trim();
      if(next===out)break;
      out=next;
    }
    return out;
  }
  function printedLineAmount(line,xMin=0){
    const positioned=rightNumber(line,xMin);
    if(positioned!=null)return positioned;
    const text=String(line?.text||'').replace(/\s+/g,' ').trim();
    const matches=[...text.matchAll(/-?\d[\d,]*[.,]\d{1,2}/g)];
    if(!matches.length)return null;
    return num(matches[matches.length-1][0]);
  }
  function mapPrintedLine(line,range){
    const positioned=lineDescriptionForMapping(line);
    let idx=mapRange(positioned,range);
    if(idx==null){
      const stripped=stripTrailingPrintedValues(line?.text||positioned);
      idx=mapRange(stripped,range);
    }
    return {idx,amount:printedLineAmount(line,0)};
  }
  function parsePayslipPage(items,pageNo){
    const lines=linesFromItems(items), row=Array(HEADERS.length).fill(null), warnings=[];
    const code=cleanEmployeeCode(fieldFromLines(lines,'Employee Code')); const name=cleanEmployeeName(fieldFromLines(lines,'Employee Name')); const pdate=periodDate(lines);
    if(name&&code)row[0]=`${name} (${code})`;
    // Some payslips print both a monthly Rate and a separate Hourly Rate. PAY RATE in the
    // Pay Grid must use Hourly Rate when present; otherwise fall back to the legacy Rate field.
    const hourlyRate=nearestValue(items,'Hourly Rate:',0);
    const legacyRate=nearestValue(items,'Rate:',0);
    const rate=hourlyRate!=null?hourlyRate:legacyRate;
    if(rate!=null)row[9]=rate;
    // Preserve printed YTD and leave values in XPaylo extension columns so a rebuilt grid can
    // be used as the previous month in Payslip Comparison without losing those figures.
    row[extraIndex.ytdTaxable]=nearestValue(items,'Taxable Earnings:',0);
    row[extraIndex.ytdPerks]=nearestValue(items,'Perks:',0);
    row[extraIndex.ytdTax]=nearestValue(items,'Tax:',0);
    row[extraIndex.leaveAnnual]=nearestValue(items,'Annual:',0);
    row[extraIndex.leaveGrace]=nearestValue(items,'Grace:',0);
    row[extraIndex.leaveAccess]=nearestValue(items,'Access:',0);
    row[extraIndex.leaveDue]=nearestValue(items,'Leave Days Due:',0);
    const clockMap={'NORMAL':1,'SUNDAY':2,'OFF DAY':3,'OVERTIME':4,'HOLIDAY':6,'NIGHTSHIFT':7,'TOTAL HOURS':8};
    let clockFound=false;
    for(const [lab,idx] of Object.entries(clockMap)){const v=nearestValue(items,lab+':',480); if(v!=null){row[idx]=v;clockFound=true;}}
    row[5]=null; // Overtime 2 is not separately printed.

    const earn=section(lines,'EARNINGS',['DEDUCTIONS','COMPANY CONTRIBUTIONS','Nett Pay:','YEAR-TO-DATE TOTALS']); let earnTotal=null;
    for(const l of earn){const d=leftDescription(l); if(!d)continue; if(norm(d)==='HOURS')continue; if(norm(d)==='TOTAL'){earnTotal=rightNumber(l,0);continue;} const mapped=mapPrintedLine(l,ranges.earn); if(mapped.idx!=null&&mapped.amount!=null)row[mapped.idx]=mapped.amount;}
    if(earnTotal==null){const vals=[];for(let i=ranges.earn[0];i<ranges.earn[1];i++)if(Number.isFinite(row[i])&&i!==16)vals.push(row[i]); if(vals.length)earnTotal=vals.reduce((a,b)=>a+b,0);}
    if(earnTotal!=null){row[16]=earnTotal;row[46]=earnTotal;row[54]=earnTotal;}

    const ded=section(lines,'DEDUCTIONS',['COMPANY CONTRIBUTIONS','Nett Pay:','YEAR-TO-DATE TOTALS']); let dedTotal=null;
    for(const l of ded){const d=leftDescription(l); if(!d)continue; if(norm(d)==='TOTAL'){dedTotal=rightNumber(l,0);continue;} const mapped=mapPrintedLine(l,ranges.ded); if(mapped.idx!=null&&mapped.amount!=null)row[mapped.idx]=mapped.amount;}
    if(dedTotal==null){const vals=[];for(let i=ranges.ded[0];i<ranges.ded[1];i++)if(Number.isFinite(row[i]))vals.push(row[i]); if(vals.length)dedTotal=vals.reduce((a,b)=>a+b,0);}
    if(dedTotal!=null)row[100]=dedTotal;

    const cc=section(lines,'COMPANY CONTRIBUTIONS',['Nett Pay:','YEAR-TO-DATE TOTALS']); let ccTotal=null;
    for(const l of cc){const d=leftDescription(l); if(!d)continue; if(norm(d)==='TOTAL'){ccTotal=rightNumber(l,0);continue;} const mapped=mapPrintedLine(l,ranges.cc); if(mapped.idx!=null&&mapped.amount!=null)row[mapped.idx]=mapped.amount;}
    if(ccTotal==null){const vals=[];for(let i=ranges.cc[0];i<ranges.cc[1];i++)if(Number.isFinite(row[i]))vals.push(row[i]); if(vals.length)ccTotal=vals.reduce((a,b)=>a+b,0);}
    if(ccTotal!=null)row[125]=ccTotal;

    const net=nearestValue(items,'Nett Pay:',450); if(net!=null)row[101]=net;
    const hasPayrollContent=Boolean(earn.length||ded.length||cc.length||net!=null||rate!=null||clockFound);
    return {
      page:pageNo,pages:[pageNo],name:name||'',code:code||'',period:pdate,row,warnings,
      sections:{earn:earn.length>0,ded:ded.length>0,cc:cc.length>0,clock:clockFound},
      hasPayrollContent,status:'partial'
    };
  }

  function sameNumber(a,b){return Number.isFinite(a)&&Number.isFinite(b)&&Math.abs(a-b)<0.005;}
  function mergePageInto(group,part,positionGrouped=false){
    if(!group.name&&part.name)group.name=part.name;
    if(!group.code&&part.code)group.code=part.code;
    if(!group.period&&part.period)group.period=part.period;
    if(!group.row[0]&&part.row[0])group.row[0]=part.row[0];
    for(let i=1;i<group.row.length;i++){
      const incoming=part.row[i]; if(incoming==null)continue;
      const existing=group.row[i];
      if(existing==null){group.row[i]=incoming;continue;}
      if(sameNumber(existing,incoming)||existing===incoming)continue;
      group.warnings.push(`Conflicting values were found on pages ${group.pages.join(', ')} and ${part.page} for ${HEADERS[i]||'a payroll field'}; the first value was kept.`);
    }
    group.pages.push(part.page);
    group.sections.earn=group.sections.earn||part.sections.earn;
    group.sections.ded=group.sections.ded||part.sections.ded;
    group.sections.cc=group.sections.cc||part.sections.cc;
    group.sections.clock=group.sections.clock||part.sections.clock;
    group.hasPayrollContent=group.hasPayrollContent||part.hasPayrollContent;
    group.warnings.push(...part.warnings);
    if(positionGrouped)group.warnings.push(`Page ${part.page} was grouped as a continuation page by position because the employee code/name was not repeated.`);
  }

  function finalizeGroup(group){
    const row=group.row;
    if(group.name&&group.code)row[0]=`${group.name} (${group.code})`;
    else group.warnings.push('Employee name/code could not be read for the complete payslip.');

    // If a known printed section exists anywhere in the grouped payslip, an omitted known item is treated as zero.
    if(group.sections.earn)for(let i=10;i<=46;i++)if(row[i]==null)row[i]=0;
    if(group.sections.ded)for(let i=55;i<=100;i++)if(row[i]==null)row[i]=0;
    if(group.sections.cc)for(let i=109;i<=125;i++)if(row[i]==null)row[i]=0;
    row[108]=row[108]??0;
    row[3]=row[3]??(group.sections.clock?0:null);
    row[6]=row[6]??(group.sections.clock?0:null);
    row[5]=null;

    if(row[46]!=null){row[16]=row[16]??row[46];row[53]=row[53]??0;row[54]=row[54]??(row[46]+(row[53]||0));}
    if(row[54]!=null&&row[125]!=null&&row[108]!=null)row[126]=row[54]+row[125]+row[108];

    if(row[9]==null)group.warnings.push('Pay rate was not found.');
    if(row[101]==null)group.warnings.push('Nett Pay was not found.');
    if(!group.sections.earn)group.warnings.push('Earnings section was not detected.');
    if(!group.sections.ded)group.warnings.push('Deductions section was not detected.');
    if(!group.sections.cc)group.warnings.push('Company Contributions section was not detected.');
    const ok=Boolean(row[0]&&row[101]!=null&&group.sections.earn);
    group.status=ok?(group.warnings.length?'review':'ready'):'failed';
    group.page=group.pages.length===1?String(group.pages[0]):`${group.pages[0]}–${group.pages[group.pages.length-1]}`;
    return group;
  }

  function groupPayslipPages(parts){
    const groups=[], byCode=new Map(); let current=null;
    for(const part of parts){
      const code=norm(part.code), name=norm(part.name);
      if(code){
        let group=byCode.get(code);
        if(!group){
          group={page:String(part.page),pages:[],name:part.name||'',code:part.code||'',period:part.period||'',row:Array(HEADERS.length).fill(null),warnings:[],sections:{earn:false,ded:false,cc:false,clock:false},hasPayrollContent:false,status:'partial'};
          groups.push(group); byCode.set(code,group);
        } else if(current!==group){
          group.warnings.push(`Page ${part.page} repeated employee code ${part.code} non-consecutively and was merged with the earlier pages for that employee.`);
        }
        mergePageInto(group,part,false); current=group; continue;
      }
      if(name&&current&&norm(current.name)===name){mergePageInto(current,part,false);continue;}
      if(!code&&!name&&part.hasPayrollContent&&current){mergePageInto(current,part,true);continue;}

      const orphan={page:String(part.page),pages:[part.page],name:part.name||'',code:part.code||'',period:part.period||'',row:part.row.slice(),warnings:[...part.warnings],sections:{...part.sections},hasPayrollContent:part.hasPayrollContent,status:'failed'};
      orphan.warnings.push(`Page ${part.page} could not be linked confidently to an employee payslip.`);
      groups.push(orphan); current=null;
    }
    return groups.map(finalizeGroup);
  }
  function crc32(bytes){let c=0xffffffff; for(const b of bytes){c^=b;for(let k=0;k<8;k++)c=(c>>>1)^((c&1)?0xedb88320:0);} return (c^0xffffffff)>>>0;}
  function u16(n){return [n&255,(n>>>8)&255]} function u32(n){return [n&255,(n>>>8)&255,(n>>>16)&255,(n>>>24)&255]}
  function makeZip(files){const enc=new TextEncoder(), chunks=[], central=[];let off=0; const push=a=>{const u=a instanceof Uint8Array?a:new Uint8Array(a);chunks.push(u);off+=u.length;};
    for(const f of files){const name=enc.encode(f.name),data=f.data instanceof Uint8Array?f.data:enc.encode(f.data),crc=crc32(data),start=off; push([...u32(0x04034b50),...u16(20),...u16(0),...u16(0),...u16(0),...u16(0),...u32(crc),...u32(data.length),...u32(data.length),...u16(name.length),...u16(0)]);push(name);push(data); central.push({name,data,crc,start});}
    const cdStart=off; for(const f of central){push([...u32(0x02014b50),...u16(20),...u16(20),...u16(0),...u16(0),...u16(0),...u16(0),...u32(f.crc),...u32(f.data.length),...u32(f.data.length),...u16(f.name.length),...u16(0),...u16(0),...u16(0),...u16(0),...u32(0),...u32(f.start)]);push(f.name);} const cdSize=off-cdStart; push([...u32(0x06054b50),...u16(0),...u16(0),...u16(central.length),...u16(central.length),...u32(cdSize),...u32(cdStart),...u16(0)]); return new Blob(chunks,{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});}
  function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
  function colName(n){let s=''; while(n){n--;s=String.fromCharCode(65+n%26)+s;n=Math.floor(n/26);}return s;}
  function cellXml(r,c,v,style=0){if(v==null||v==='')return ''; const ref=colName(c)+r; if(typeof v==='number'&&Number.isFinite(v))return `<c r="${ref}" s="${style}"><v>${v}</v></c>`; return `<c r="${ref}" s="${style}" t="inlineStr"><is><t>${esc(v)}</t></is></c>`;}
  function workbookBlob(records){
    const first=records.find(r=>r.period)?.period||''; const di=dateInfo(first); const rows=[];
    rows[1]=['Cycle Details',`Monthly ( ${di.month||'Unknown'} )  Tax Year : ${di.taxYear||''}`]; rows[2]=['Tax Year :',di.taxYear||'']; rows[3]=['Employee Type :','ALL']; rows[4]=['Department :','All']; rows[5]=['Time & Attendance: Lock Date :',null]; rows[6]=['Contract Type :','Employee Contract Hours']; rows[8]=CATEGORIES; rows[9]=['PREVIOUS TOTALS']; rows[11]=HEADERS;
    const data=records.filter(r=>r.status!=='failed'&&r.selected!==false).map(r=>r.row); const totals=Array(HEADERS.length).fill(null); totals[0]='TOTALS'; for(let c=1;c<127;c++){let any=false,s=0; for(const r of data)if(Number.isFinite(r[c])){s+=r[c];any=true;} totals[c]=any?s:null;} rows[10]=totals; data.forEach((r,i)=>rows[12+i]=r);
    let sheet=''; const maxRow=11+data.length; for(let r=1;r<=maxRow;r++){const vals=rows[r]||[]; let cs=''; for(let c=1;c<=HEADERS.length;c++)cs+=cellXml(r,c,vals[c-1],r===8||r===11?1:0); sheet+=`<row r="${r}">${cs}</row>`;}
    const ws=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><dimension ref="A1:${colName(HEADERS.length)}${maxRow}"/><sheetViews><sheetView workbookViewId="0"/></sheetViews><sheetFormatPr defaultRowHeight="15"/><sheetData>${sheet}</sheetData></worksheet>`;
    const files=[
      {name:'[Content_Types].xml',data:'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>'},
      {name:'_rels/.rels',data:'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'},
      {name:'xl/workbook.xml',data:'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Payroll - Pay Grid" sheetId="1" r:id="rId1"/></sheets></workbook>'},
      {name:'xl/_rels/workbook.xml.rels',data:'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>'},
      {name:'xl/styles.xml',data:'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="1"><fill><patternFill patternType="none"/></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs></styleSheet>'},
      {name:'xl/worksheets/sheet1.xml',data:ws}
    ]; return makeZip(files);
  }
  let state=[];
  let pdfPageCount=0;
  function render(){
    const tb=byId('payGridRebuildRows'); if(!tb)return; tb.innerHTML=''; let ready=0,warn=0,failed=0;
    state.forEach((r,i)=>{if(r.status==='ready')ready++; else if(r.status==='review')warn++; else failed++; const tr=document.createElement('tr'); const badge=r.status==='ready'?'Ready':r.status==='review'?'Review':'Failed'; tr.innerHTML=`<td><input type="checkbox" data-rebuild-select="${i}" ${r.selected!==false&&r.status!=='failed'?'checked':''} ${r.status==='failed'?'disabled':''}></td><td>${esc(r.page)}</td><td>${esc(r.name||'####')}</td><td>${esc(r.code||'####')}</td><td class="num">${money(r.row[54])}</td><td class="num">${money(r.row[100])}</td><td class="num">${money(r.row[101])}</td><td><span class="rebuild-badge ${r.status}">${badge}</span></td>`; tb.appendChild(tr);});
    byId('payGridPageCount').textContent=pdfPageCount;byId('payGridReadyCount').textContent=ready;byId('payGridWarningCount').textContent=warn;byId('payGridFailedCount').textContent=failed;
    const ws=byId('payGridRebuildWarnings'), messages=state.flatMap(r=>r.warnings.map(w=>`Pages ${r.page}: ${w}`)); ws.classList.toggle('hidden',!messages.length); ws.innerHTML=messages.length?'<strong>Review notes</strong><ul>'+messages.map(x=>`<li>${esc(x)}</li>`).join('')+'</ul>':'';
    byId('payGridRebuildSummaryCard').classList.toggle('hidden',!state.length);byId('payGridRebuildGenerateCard').classList.toggle('hidden',!state.some(r=>r.status!=='failed'));
    byId('payGridRebuildMeta').textContent=`${pdfPageCount} PDF page${pdfPageCount===1?'':'s'} analysed · ${state.length} payslip${state.length===1?'':'s'} grouped · ${ready+warn} reconstructable`;
  }
  async function loadPdf(file){
    if(!file||!/\.pdf$/i.test(file.name)){status('payslipPdfStatus','Please choose a PDF file.','error');return;}
    status('payslipPdfStatus',`Reading ${file.name}…`,'working');
    try{
      const bytes=new Uint8Array(await file.arrayBuffer()),parsed=findObjects(bytes),pages=orderedPageIds(parsed.map); if(!pages.length)throw new Error('No PDF pages were found.');
      pdfPageCount=pages.length;
      const parts=pages.map((id,i)=>parsePayslipPage(pageItems(bytes,parsed,id),i+1));
      state=groupPayslipPages(parts); state.forEach(r=>r.selected=r.status!=='failed'); render();
      const okay=state.filter(r=>r.status!=='failed').length;
      status('payslipPdfStatus',`Loaded ${file.name} · ${pages.length} pages · ${state.length} payslips · ${okay} reconstructable`,okay?'success':'error');
    }
    catch(e){console.error(e);state=[];pdfPageCount=0;render();status('payslipPdfStatus',e.message||'The PDF could not be read.','error');}
  }
  function setup(){const inp=byId('payslipPdfInput');if(!inp)return; inp.addEventListener('change',()=>loadPdf(inp.files[0])); const dz=byId('payslipPdfDropZone'); ['dragenter','dragover'].forEach(ev=>dz.addEventListener(ev,e=>{e.preventDefault();dz.classList.add('dragging')})); ['dragleave','drop'].forEach(ev=>dz.addEventListener(ev,e=>{e.preventDefault();dz.classList.remove('dragging')})); dz.addEventListener('drop',e=>loadPdf(e.dataTransfer.files[0]));
    byId('payGridRebuildRows').addEventListener('change',e=>{const i=e.target.dataset.rebuildSelect;if(i!=null)state[Number(i)].selected=e.target.checked;});
    byId('payGridSelectAllBtn').addEventListener('click',()=>{state.forEach(r=>r.selected=r.status!=='failed');render();}); byId('payGridClearAllBtn').addEventListener('click',()=>{state.forEach(r=>r.selected=false);render();}); byId('clearPayGridRebuildBtn').addEventListener('click',()=>{state=[];pdfPageCount=0;inp.value='';render();status('payslipPdfStatus','No payslip PDF loaded.','neutral');});
    byId('downloadPayGridBtn').addEventListener('click',()=>{const selected=state.filter(r=>r.selected&&r.status!=='failed');if(!selected.length){status('payslipPdfStatus','Select at least one reconstructed employee.','error');return;}const blob=workbookBlob(selected),a=document.createElement('a');a.href=URL.createObjectURL(blob);const d=dateInfo(selected.find(r=>r.period)?.period||'');a.download=`XPaylo-Rebuilt-Pay-Grid-${d.month||'Payroll'}-${d.year||''}.xlsx`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),2000);status('payslipPdfStatus',`Pay Grid created for ${selected.length} employee${selected.length===1?'':'s'}.`,'success');});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup);else setup();
})();
