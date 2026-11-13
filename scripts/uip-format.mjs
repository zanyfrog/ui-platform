// JSON-valued CSV cells preserve scalar types, nulls and structured permitted values.
const marker = '#uip-json-cells-v1';
const unsafe = new Set(['__proto__','constructor','prototype']);
export function validateRows(rows) {
  if (!Array.isArray(rows) || rows.length>10000) throw Error('Expected an array of at most 10000 records.');
  const ids=new Set();for(const row of rows){if(!row||typeof row!=='object'||Array.isArray(row)||Object.keys(row).some(k=>unsafe.has(k)))throw Error('Invalid record or unsafe field name.');if(typeof row.id!=='string'||!row.id.trim())throw Error('Every record requires an explicit string id.');if(ids.has(row.id))throw Error('Duplicate record id.');ids.add(row.id);}
  return rows;
}
function csvRows(text){const rows=[];let row=[],field='',quoted=false,closed=false;
  for(let i=0;i<text.length;i++){const c=text[i];if(quoted){if(c==='"'){if(text[i+1]==='"'){field+='"';i++;}else{quoted=false;closed=true;}}else field+=c;continue;}
    if(c==='"'){if(field||closed)throw Error('Malformed CSV quotation.');quoted=true;}
    else if(c===','||c==='\r'||c==='\n'){row.push(field);field='';closed=false;if(c!==','){if(c==='\r'&&text[i+1]==='\n')i++;rows.push(row);row=[];}}
    else {if(closed)throw Error('Unexpected character after CSV quotation.');field+=c;}}
  if(quoted)throw Error('Unterminated CSV quotation.');if(field||closed||row.length){row.push(field);rows.push(row);}return rows;}
export function parseFile(text,format){if(text.length>10_000_000)throw Error('File exceeds 10 MB.');text=text.replace(/^\uFEFF/,'');if(format==='json')return validateRows(JSON.parse(text));if(format!=='csv')throw Error('Format must be csv or json.');let typed=false;if(text.startsWith(marker+'\r\n')){typed=true;text=text.slice(marker.length+2);}else if(text.startsWith(marker+'\n')){typed=true;text=text.slice(marker.length+1);}if(typed && !text.trim())return [];const [headers,...rows]=csvRows(text);if(!headers||!headers.length||headers.some(k=>!k||unsafe.has(k))||new Set(headers).size!==headers.length)throw Error('Invalid or duplicate CSV headers.');return validateRows(rows.map(row=>{if(row.length!==headers.length)throw Error('CSV column count differs from header.');return Object.fromEntries(headers.map((key,i)=>[key,typed?JSON.parse(row[i]):row[i]]));}));}
export function serialize(rows,format){validateRows(rows);if(format==='json')return JSON.stringify(rows,null,2)+'\n';if(format!=='csv')throw Error('Format must be csv or json.');if(!rows.length)return marker+'\r\n';const keys=[...new Set(rows.flatMap(Object.keys))];if(rows.some(row=>keys.some(key=>!Object.hasOwn(row,key))))throw Error('CSV requires a uniform permitted field set; use JSON for sparse records.');const cell=s=>'"'+String(s).replaceAll('"','""')+'"';return marker+'\r\n'+keys.map(cell).join(',')+'\r\n'+rows.map(r=>keys.map(k=>cell(JSON.stringify(r[k]??null))).join(',')).join('\r\n')+(rows.length?'\r\n':'');}
