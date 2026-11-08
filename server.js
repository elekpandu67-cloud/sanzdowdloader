const express = require('express');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 3000;
app.use(cors());
app.use(express.json());
app.use((req,res,next)=>{ res.header('Access-Control-Allow-Origin','*'); next(); });

const COBALT = 'https://api.cobalt.tools';

async function cobalt(url, opts={}) {
  const r = await fetch(COBALT, {
    method: 'POST',
    headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, ...opts })
  });
  const data = await r.json();
  if(!r.ok) throw new Error(data?.text || data?.error?.code || 'Cobalt gagal');
  return data;
}

app.get('/', (req,res)=> res.json({ status: 'SanzDownloader Backend Jalan! Cobalt', endpoints: ['/api/info?url=', '/api/download?url=&format='] }));

// Info: judul dari URL + thumbnail dari cobalt
app.get('/api/info', async (req,res)=>{
  const { url } = req.query;
  if(!url) return res.status(400).json({ error: 'URL wajib diisi' });
  try {
    // Coba ambil info via cobalt dengan mode audio dulu biar cepat dapat data
    const data = await cobalt(url, { downloadMode: 'auto', filenameStyle: 'basic' });
    res.json({
      title: data?.filename || 'Video',
      thumbnail: data?.picker?.[0]?.thumb || data?.thumb || '',
      uploader: 'SanzDownloader',
      duration: 0,
      webpage_url: url,
      picker: data?.picker || null,
      url: data?.url || null,
      status: data?.status
    });
  } catch(e){
    res.status(500).json({ error: 'Gagal ambil info. Link mungkin private / dibatasi.', detail: String(e).slice(0,300) });
  }
});

// Download: redirect ke link asli dari cobalt
app.get('/api/download', async (req,res)=>{
  const { url, format } = req.query;
  if(!url) return res.status(400).json({ error: 'URL wajib diisi' });
  try {
    let opts = { downloadMode: 'auto', filenameStyle: 'basic' };
    if(format === 'mp3') opts = { downloadMode: 'audio', filenameStyle: 'basic', audioFormat: 'mp3' };
    if(format === '720') opts = { downloadMode: 'auto', filenameStyle: 'basic', videoQuality: '720' };
    if(format === '1080') opts = { downloadMode: 'auto', filenameStyle: 'basic', videoQuality: '1080' };
    if(format === '480') opts = { downloadMode: 'auto', filenameStyle: 'basic', videoQuality: '480' };
    const data = await cobalt(url, opts);
    if(data?.url) return res.redirect(data.url);
    if(data?.picker?.[0]?.url) return res.redirect(data.picker[0].url);
    res.status(500).json({ error: 'Cobalt tidak mengembalikan link download', data });
  } catch(e){
    res.status(500).json({ error: 'Gagal download. Coba link lain.', detail: String(e).slice(0,300) });
  }
});

app.listen(PORT, ()=> console.log('SanzDownloader backend jalan di port ' + PORT));
