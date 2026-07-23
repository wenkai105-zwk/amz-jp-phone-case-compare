(() => {
  const table=document.querySelector(".table-wrap table"),tbody=table?.tBodies?.[0],count=table?.tHead?.rows?.[0]?.cells?.length-1;
  if(!tbody||!count||document.querySelector(".profit-section-row"))return;
  const fixed={currency:"USD",priceCurrency:"USD",cnyPerUsd:7,jpyPerUsd:160,commissionRate:10.4,couponUsd:.9375,operatorRate:0,jctRate:10};
  const costCnyByProduct=[46,46,42.5,42.5,47,44.5,46,46,46,42.5,42.5,46,46,47.5,46,39.5,42.5,42.5,39.5,44.5,47,39.5,39.5,44.5,39.5,47,47,79.5,52.5,47,47,47.5,47];
  const base={saleUsd:25,fba:1.84,wh:0,refundRate:5,adRate:25,logistics:.03,targetMargin:""};
  const states=Array.from({length:count},(_,i)=>{const costCny=costCnyByProduct[i]??0,costUsd=costCny/fixed.cnyPerUsd;return{...base,costCny,costUsd,costJpy:costUsd*fixed.jpyPerUsd}});
  const bulkDrafts={fba:1.84,wh:0,refundRate:5,adRate:25,logistics:.03,targetMargin:10};
  const storageKey="wakcas-profit-calculator-v1";
  try{
    const saved=JSON.parse(localStorage.getItem(storageKey)||"null");
    if(saved?.fixed)Object.assign(fixed,saved.fixed);
    if(Array.isArray(saved?.states))saved.states.slice(0,count).forEach((value,i)=>Object.assign(states[i],value));
    if(saved?.bulkDrafts)Object.assign(bulkDrafts,saved.bulkDrafts);
  }catch(_){}
  const num=v=>{const n=Number.parseFloat(v);return Number.isFinite(n)?n:0};
  const persist=()=>{try{localStorage.setItem(storageKey,JSON.stringify({fixed,states,bulkDrafts}))}catch(_){}};
  const currencyMeta={USD:{symbol:"US$",code:"USD"},CNY:{symbol:"¥",code:"CNY"},JPY:{symbol:"JP¥",code:"JPY"}};
  const fromUsd=v=>fixed.currency==="CNY"?v*fixed.cnyPerUsd:fixed.currency==="JPY"?v*fixed.jpyPerUsd:v;
  const toUsd=v=>fixed.currency==="CNY"?(fixed.cnyPerUsd?v/fixed.cnyPerUsd:0):fixed.currency==="JPY"?(fixed.jpyPerUsd?v/fixed.jpyPerUsd:0):v;
  const money=v=>`${currencyMeta[fixed.currency].symbol}${fromUsd(Number.isFinite(v)?v:0).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}`;
  const priceFromUsd=v=>fixed.priceCurrency==="CNY"?v*fixed.cnyPerUsd:fixed.priceCurrency==="JPY"?v*fixed.jpyPerUsd:v;
  const priceToUsd=v=>fixed.priceCurrency==="CNY"?(fixed.cnyPerUsd?v/fixed.cnyPerUsd:0):fixed.priceCurrency==="JPY"?(fixed.jpyPerUsd?v/fixed.jpyPerUsd:0):v;
  const priceMoney=v=>`${currencyMeta[fixed.priceCurrency].symbol}${priceFromUsd(Number.isFinite(v)?v:0).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}`;
  const row=(label,cls="")=>{const tr=document.createElement("tr");tr.className=cls;const th=document.createElement("th");th.textContent=label;tr.appendChild(th);for(let i=0;i<count;i++){const td=document.createElement("td");td.dataset.profitI=i;tr.appendChild(td)}tbody.appendChild(tr);return tr};
  const band=(label,cls)=>row(label,cls);
  const line=(tag,body,cls="")=>`<div class="compact-line ${cls}"><span class="tag">${tag}</span>${body}</div>`;
  const amount=key=>`<span class="amount" data-output="${key}"></span>`;
  const input=(field,unit,step=".01",moneyMode="")=>`<input class="mini-input" data-field="${field}" ${moneyMode==="calc"?'data-money-input="1"':moneyMode==="sale"?'data-sale-input="1"':""} type="number" inputmode="decimal" min="0" step="${step}"><span ${moneyMode==="calc"?'data-money-unit="1"':moneyMode==="sale"?'data-sale-unit="1"':""}>${moneyMode==="calc"?fixed.currency:moneyMode==="sale"?fixed.priceCurrency:unit}</span>`;
  const detail=(label,note,builder,cls="")=>{const r=row(label,`profit-detail-row ${cls}`.trim());r.cells[0].innerHTML=`${label}${note?`<span class="profit-label-note">${note}</span>`:""}`;[...r.querySelectorAll("td")].forEach((td,i)=>{td.innerHTML=`<div class="compact-card">${builder()}</div>`;td.querySelectorAll("input").forEach(el=>{const initial=el.dataset.moneyInput?fromUsd(states[i][el.dataset.field]):el.dataset.saleInput?priceFromUsd(states[i][el.dataset.field]):states[i][el.dataset.field];el.value=initial===""?"":num(initial).toFixed(2);el.addEventListener("input",()=>{const raw=el.value===""?"":num(el.value);states[i][el.dataset.field]=el.dataset.moneyInput&&raw!==""?toUsd(raw):el.dataset.saleInput&&raw!==""?priceToUsd(raw):raw;if(["costCny","costJpy","costUsd"].includes(el.dataset.field))syncCost(i,el.dataset.field);render(i);persist()});el.addEventListener("blur",()=>{if(el.value!=="")el.value=num(el.value).toFixed(2)})})});return r};
  const pair=(label,note,leftKey,rightKey,profit=false)=>{const r=row(label,"profit-summary");r.cells[0].innerHTML=`${label}<span class="profit-label-note">${note}</span>`;[...r.querySelectorAll("td")].forEach((td,i)=>td.innerHTML=`<div class="pair-card ${profit?"profit":""}" data-pair="${leftKey}" data-index="${i}"><span data-pair-value="${leftKey}"></span><span data-pair-value="${rightKey}"></span></div>`)};

  row("","profit-spacer-row");
  const global=row("统一参数设置","global-settings-row"),cell=global.cells[1];cell.colSpan=count;while(global.cells.length>2)global.deleteCell(2);
  cell.innerHTML=`<div class="global-settings"><div class="settings-block"><span class="settings-title">固定参数 · 自动应用全部</span><div class="settings-grid">
    <label class="setting"><span class="setting-title">计算币种</span><span class="setting-control"><select id="profitCurrency"><option value="USD">美元 USD</option><option value="CNY">人民币 CNY</option><option value="JPY">日元 JPY</option></select></span></label>
    <label class="setting"><span class="setting-title">销售价币种</span><span class="setting-control"><select id="saleCurrency"><option value="USD">美元 USD</option><option value="CNY">人民币 CNY</option><option value="JPY">日元 JPY</option></select></span></label>
    ${fixedBox("人民币汇率","cnyPerUsd",fixed.cnyPerUsd,"CNY/USD",".01")}
    ${fixedBox("日元汇率","jpyPerUsd",fixed.jpyPerUsd,"JPY/USD",".01")}
    ${fixedBox("平台佣金","commissionRate",fixed.commissionRate,"%","0.1")}
    ${fixedBox("Coupon","couponUsd",fixed.couponUsd,"USD",".01",false,true)}
    ${fixedBox("代运营佣金","operatorRate",fixed.operatorRate,"%","0.1")}
    ${fixedBox("JCT","jctRate",fixed.jctRate,"%","0.1",true)}
  </div></div><div class="settings-block optional-settings-block"><div class="settings-heading"><span class="settings-title">可选一键设置 · 留空不修改</span><button id="clearOptionalAll" class="clear-all" type="button">一键清除</button></div><div class="settings-grid">
    ${bulk("FBA Fee","fba","USD")}${bulk("WH Cost","wh","USD")}${bulk("Refund","refundRate","%")}${bulk("广告","adRate","%")}${bulk("头程＋关税","logistics","USD")}${bulk("利润率倒推","targetMargin","%")}
  </div></div></div>`;
  cell.querySelector("#profitCurrency").value=fixed.currency;
  cell.querySelector("#saleCurrency").value=fixed.priceCurrency;
  cell.querySelectorAll("[data-bulk]").forEach(el=>el.addEventListener("input",()=>{bulkDrafts[el.dataset.bulk]=el.value===""?"":el.dataset.bulkMoney?toUsd(num(el.value)):num(el.value);persist()}));
  cell.querySelector("#profitCurrency").addEventListener("change",e=>{fixed.currency=e.target.value;refreshCurrencyInputs();renderAll();persist()});
  cell.querySelector("#saleCurrency").addEventListener("change",e=>{fixed.priceCurrency=e.target.value;refreshCurrencyInputs();renderAll();persist()});
  cell.querySelector("#clearOptionalAll").addEventListener("click",()=>{
    const fields=["fba","wh","refundRate","adRate","logistics","targetMargin"];
    cell.querySelectorAll("[data-bulk]").forEach(el=>{el.value="";bulkDrafts[el.dataset.bulk]=""});
    states.forEach((s,i)=>{
      fields.forEach(field=>{
        s[field]=field==="targetMargin"?"":0;
        const local=document.querySelector(`[data-profit-i="${i}"] input[data-field="${field}"]`);
        if(local)local.value=field==="targetMargin"?"":"0.00";
      });
      render(i);
    });
    persist();
  });
  cell.querySelectorAll("[data-fixed]").forEach(el=>{el.value=num(el.value).toFixed(2);el.addEventListener("input",()=>{const raw=num(el.value);fixed[el.dataset.fixed]=el.dataset.fixed==="couponUsd"?toUsd(raw):raw;if(["cnyPerUsd","jpyPerUsd"].includes(el.dataset.fixed))states.forEach((_,i)=>syncCost(i,"costUsd"));refreshCurrencyInputs();renderAll();persist()});el.addEventListener("blur",()=>{if(el.value!=="")el.value=num(el.value).toFixed(2)})});
  cell.querySelectorAll("[data-bulk]").forEach(el=>el.addEventListener("blur",()=>{if(el.value!=="")el.value=num(el.value).toFixed(2)}));
  cell.querySelectorAll(".apply-all").forEach(btn=>btn.addEventListener("click",()=>{const field=btn.dataset.apply,source=cell.querySelector(`[data-bulk="${field}"]`);if(source.value==="")return;const raw=num(source.value),v=source.dataset.bulkMoney?toUsd(raw):raw;states.forEach((s,i)=>{s[field]=v;const local=document.querySelector(`[data-profit-i="${i}"] input[data-field="${field}"]`);if(local)local.value=(local.dataset.moneyInput?fromUsd(v):v).toFixed(2);render(i)});persist()}));
  cell.querySelectorAll(".clear-one").forEach(btn=>btn.addEventListener("click",()=>{
    const field=btn.dataset.clear,source=cell.querySelector(`[data-bulk="${field}"]`);
    if(source)source.value="";
    bulkDrafts[field]="";
    states.forEach((s,i)=>{
      s[field]=field==="targetMargin"?"":0;
      const local=document.querySelector(`[data-profit-i="${i}"] input[data-field="${field}"]`);
      if(local)local.value=field==="targetMargin"?"":"0.00";
      render(i);
    });
    persist();
  }));

  band("利润测算","profit-section-row");
  detail("销售价","按销售价币种输入；启用倒推后自动更新",()=>line("销售价",input("saleUsd","USD",".01","sale"),"input"));
  band("产品成本","profit-subsection-row");
  detail("产品成本","三币种联动换算，结果按所选币种展示",()=>line("人民币",input("costCny","CNY"),"input")+line("日元",input("costJpy","JPY"),"input")+line("美元",input("costUsd","USD"),"input"));
  band("亚马逊成本","profit-subsection-row");
  pair("销售JCT","左：税额｜右：税率","salesJct","jctRate");
  pair("平台佣金","左：佣金｜右：JCT","commission","commissionJct");
  pair("Coupon","左：Coupon｜右：JCT","coupon","couponJct");
  detail("FBA Fee","上：费用｜下：JCT",()=>line("费用",input("fba","USD",".01","calc"),"input")+line("JCT",amount("fbaJct")));
  detail("WH Cost","上：费用｜下：JCT",()=>line("费用",input("wh","USD",".01","calc"),"input")+line("JCT",amount("whJct")));
  detail("Refund","上：比例｜下：退款成本",()=>line("比例",input("refundRate","%","0.1"),"input")+line("金额",amount("refund")));
  detail("AD Investment","上：比例｜中：广告费｜下：JCT",()=>line("比例",input("adRate","%","0.1"),"input")+line("金额",amount("ad"))+line("JCT",amount("adJct")));
  band("物流成本","profit-subsection-row");
  detail("头程＋关税","按所选计算币种输入",()=>line("费用",input("logistics","USD",".01","calc"),"input"));
  band("代运营成本","profit-subsection-row");
  pair("代运营佣金","左：佣金｜右：费率","operatorFee","operatorRate");
  band("Net Margin","profit-subsection-row");
  pair("业务层面净利","左：净利｜右：净利率；不扣代运营","businessMargin","businessRate",true);
  pair("工厂净收入","左：净利｜右：净利率；已扣代运营","factoryProfit","factoryRate",true);
  band("利润率倒推","profit-subsection-row");
  detail("利润率倒推","输入目标工厂净利率，输出建议含税售价",()=>line("目标",input("targetMargin","%","0.1"),"input")+line("建议售价",amount("reversePrice"),"reverse-result"),"reverse-row");

  function fixedBox(label,field,value,unit,step,disabled=false,isMoney=false){return `<label class="setting"><span class="setting-title">${label}</span><span class="setting-control"><input data-fixed="${field}" ${isMoney?'data-fixed-money="1"':""} type="number" min="0" step="${step}" value="${value}" ${disabled?"disabled":""}><span class="setting-unit" ${isMoney?'data-money-unit="1"':""}>${isMoney?fixed.currency:unit}</span></span></label>`}
  function bulk(label,field,unit){const isMoney=unit==="USD",savedValue=bulkDrafts[field]??"",displayValue=savedValue===""?"":(isMoney?fromUsd(num(savedValue)):num(savedValue)).toFixed(2);return `<label class="setting bulk-setting"><span class="setting-title">${label}<span data-bulk-unit-label>${isMoney?`（${fixed.currency}）`:`（${unit}）`}</span></span><span class="setting-control"><input data-bulk="${field}" ${isMoney?'data-bulk-money="1"':""} type="number" min="0" step="0.1" placeholder="留空" value="${displayValue}"></span><button class="clear-one" data-clear="${field}" type="button">清除</button><button class="apply-all" data-apply="${field}" type="button">应用全部</button></label>`}
  function syncCost(i,source){const s=states[i];if(source==="costUsd"){s.costCny=s.costUsd*fixed.cnyPerUsd;s.costJpy=s.costUsd*fixed.jpyPerUsd}else if(source==="costCny"){s.costUsd=fixed.cnyPerUsd?s.costCny/fixed.cnyPerUsd:0;s.costJpy=s.costUsd*fixed.jpyPerUsd}else{s.costUsd=fixed.jpyPerUsd?s.costJpy/fixed.jpyPerUsd:0;s.costCny=s.costUsd*fixed.cnyPerUsd}for(const f of["costCny","costJpy","costUsd"]){const el=document.querySelector(`[data-profit-i="${i}"] input[data-field="${f}"]`);if(el)el.value=s[f].toFixed(2)}}
  function calc(s){const sale=s.saleUsd,jct=fixed.jctRate/100,cr=fixed.commissionRate/100,rr=num(s.refundRate)/100,ar=num(s.adRate)/100,or=fixed.operatorRate/100,salesJct=sale/(1+jct)*jct,commission=sale*cr,refund=sale*rr-sale*rr*cr*(1+jct)*.8,ad=sale*ar,netSales=sale-salesJct-commission-fixed.couponUsd-s.fba-s.wh-refund-ad,businessMargin=netSales-s.costUsd-s.logistics,operatorFee=sale*or,factoryProfit=businessMargin-operatorFee,target=s.targetMargin===""?null:num(s.targetMargin)/100,coefficient=1-jct/(1+jct)-cr-rr+rr*cr*(1+jct)*.8-ar-or,fixedCosts=fixed.couponUsd+s.fba+s.wh+s.costUsd+s.logistics,reversePrice=target===null?null:(coefficient-target)>0?fixedCosts/(coefficient-target):NaN;return{salesJct,jctRate:fixed.jctRate,commission,commissionJct:commission*jct,coupon:fixed.couponUsd,couponJct:fixed.couponUsd*jct,fbaJct:s.fba*jct,whJct:s.wh*jct,refund,ad,adJct:ad*jct,operatorFee,operatorRate:fixed.operatorRate,businessMargin,businessRate:sale?businessMargin/sale*100:0,factoryProfit,factoryRate:sale?factoryProfit/sale*100:0,reversePrice}}
  function refreshCurrencyInputs(){document.querySelectorAll("[data-money-input]").forEach(el=>{const td=el.closest("[data-profit-i]"),i=Number(td?.dataset.profitI);if(Number.isInteger(i))el.value=fromUsd(states[i][el.dataset.field]).toFixed(2)});document.querySelectorAll("[data-money-unit]").forEach(el=>el.textContent=fixed.currency);document.querySelectorAll("[data-sale-input]").forEach(el=>{const td=el.closest("[data-profit-i]"),i=Number(td?.dataset.profitI);if(Number.isInteger(i))el.value=priceFromUsd(states[i][el.dataset.field]).toFixed(2)});document.querySelectorAll("[data-sale-unit]").forEach(el=>el.textContent=fixed.priceCurrency);const coupon=cell.querySelector('[data-fixed="couponUsd"]');if(coupon)coupon.value=fromUsd(fixed.couponUsd).toFixed(2);cell.querySelectorAll("[data-bulk-money]").forEach(el=>{const savedValue=bulkDrafts[el.dataset.bulk];el.value=savedValue===""?"":fromUsd(num(savedValue)).toFixed(2)});cell.querySelectorAll("[data-bulk-unit-label]").forEach(el=>{const input=el.closest(".setting")?.querySelector("[data-bulk]");if(input?.dataset.bulkMoney)el.textContent=`（${fixed.currency}）`})}
  function format(key,v){if(key.endsWith("Rate")||key==="jctRate")return`${v.toFixed(2)}%`;if(v===null)return"未启用";if(!Number.isFinite(v))return"目标不可达";return key==="reversePrice"?priceMoney(v):money(v)}
  function render(i){let vals=calc(states[i]);if(states[i].targetMargin!==""&&Number.isFinite(vals.reversePrice)){states[i].saleUsd=vals.reversePrice;const saleInput=document.querySelector(`[data-profit-i="${i}"] input[data-field="saleUsd"]`);if(saleInput)saleInput.value=priceFromUsd(states[i].saleUsd).toFixed(2);vals=calc(states[i])}document.querySelectorAll(`[data-profit-i="${i}"] [data-output]`).forEach(out=>{const v=vals[out.dataset.output];out.textContent=format(out.dataset.output,v);out.classList.toggle("muted-result",v===null)});for(const left of["salesJct","commission","coupon","operatorFee","businessMargin","factoryProfit"]){const card=document.querySelector(`[data-pair="${left}"][data-index="${i}"]`);if(!card)continue;card.querySelectorAll("[data-pair-value]").forEach(out=>{const key=out.dataset.pairValue;out.textContent=format(key,vals[key])});if(["businessMargin","factoryProfit"].includes(left)){card.classList.toggle("positive",vals[left]>=0);card.classList.toggle("negative",vals[left]<0)}}}
  function renderAll(){states.forEach((_,i)=>render(i))}
  renderAll();
})();
