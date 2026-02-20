import https from 'https';

// Test unavatar CORS
https.get('https://unavatar.io/twitter/miegrains', (res) => {
  console.log('Unavatar headers:', res.headers);
});

// Test vxtwitter without User-Agent
const req = https.get('https://api.vxtwitter.com/miegrains', {
  headers: {
    // intentional no User-Agent
  }
}, (res) => {
  console.log('vxtwitter status (no UA):', res.statusCode);
  let data = '';
  res.on('data', c => data += c);
  res.on('end', () => console.log('vxtwitter data:', data.substring(0, 100)));
});
req.on('error', console.error);
