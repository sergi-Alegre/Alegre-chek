import crypto from 'node:crypto';

const COOKIE='alegre_office';

function secret(){return String(process.env.OFFICE_PIN||'')}
function token(){const s=secret();return s?crypto.createHmac('sha256',s).update('alegre-office-v1').digest('hex'):''}
function parseCookies(raw=''){return Object.fromEntries(raw.split(';').map(x=>x.trim()).filter(Boolean).map(x=>{const i=x.indexOf('=');return i<0?[x,'']:[x.slice(0,i),decodeURIComponent(x.slice(i+1))]}))}
export function officeConfigured(){return Boolean(secret())}
export function officeAuthorized(req){if(!officeConfigured())return false;const c=parseCookies(req.headers.cookie||'');const a=Buffer.from(c[COOKIE]||'');const b=Buffer.from(token());return a.length===b.length&&a.length>0&&crypto.timingSafeEqual(a,b)}
export function officePinValid(pin){const a=Buffer.from(String(pin||''));const b=Buffer.from(secret());return a.length===b.length&&a.length>0&&crypto.timingSafeEqual(a,b)}
export function officeCookie(){return `${COOKIE}=${encodeURIComponent(token())}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=43200`}
