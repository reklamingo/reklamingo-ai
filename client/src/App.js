// client/src/App.js
import React, { useState } from 'react';
import axios from 'axios';

export default function App() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [token, setToken] = useState('');
  const [prompt, setPrompt] = useState('');
  const [text, setText] = useState('');
  const [textColor, setTextColor] = useState('#ffffff');
  const [textFont, setTextFont] = useState('Quicksand');
  const [textSize, setTextSize] = useState(48);
  const [logo, setLogo] = useState(null);
  const [logoScale, setLogoScale] = useState(100);
  const [bgMode, setBgMode] = useState('ai');
  const [bgColor, setBgColor] = useState('#ffffff');
  const [bgImage, setBgImage] = useState(null);
  const [logoPosition, setLogoPosition] = useState('top');
  const [size, setSize] = useState('1080x1080');
  const [customWidth, setCustomWidth] = useState('');
  const [customHeight, setCustomHeight] = useState('');
  const [frameColor, setFrameColor] = useState('#3ecf00');
  const [image, setImage] = useState('');
  const [stage, setStage] = useState('login');
  const [loading, setLoading] = useState(false);
  const [paymentIframe, setPaymentIframe] = useState(null);

  const handleRegister = async () => {
    await axios.post(`/api/register`, { email, password });
    alert('Kayıt tamamlandı');
    setStage('login');
  };

  const handleLogin = async () => {
    const res = await axios.post(`/api/login`, { email, password });
    setToken(res.data.token);
    setStage('generate');
  };

  const handleGenerate = async () => {
    setLoading(true);
    const formData = new FormData();
    formData.append('prompt', prompt);
    formData.append('overlayText', text);
    formData.append('size', size);
    formData.append('customWidth', customWidth);
    formData.append('customHeight', customHeight);
    formData.append('bgMode', bgMode);
    formData.append('bgColor', bgColor);
    formData.append('logoPosition', logoPosition);
    formData.append('logoScale', logoScale);
    formData.append('textColor', textColor);
    formData.append('textFont', textFont);
    formData.append('textSize', textSize);
    formData.append('frameColor', frameColor);
    if (logo) formData.append('logo', logo);
    if (bgImage && bgMode === 'image') formData.append('bgImage', bgImage);

    try {
      const res = await axios.post(`/api/generate-image`, formData, {
        headers: {
          Authorization: token,
          'Content-Type': 'multipart/form-data',
        },
      });
      setImage(res.data.imageUrl);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleBuyCredit = async () => {
    const res = await axios.post(`/api/paytr/init`, { email, amount: 69 });
    const iframeHTML = `<iframe src="https://www.paytr.com/odeme/guvenli/${res.data.token}" frameborder="0" scrolling="no" style="width: 100%; min-height: 600px;"></iframe>`;
    setPaymentIframe(iframeHTML);
  };

  return (
    <div className="min-h-screen bg-primary text-white p-4 font-sans flex flex-col items-center">
      <div className="max-w-xl w-full bg-blue-800 p-6 rounded-xl shadow-lg space-y-4">
        <h1 className="text-3xl font-bold mb-2">AI Tasarım Stüdyosu</h1>

        {stage === 'login' && (
          <div className="space-y-2">
            <input className="p-2 text-black w-full" placeholder="Email" onChange={e => setEmail(e.target.value)} />
            <input className="p-2 text-black w-full" placeholder="Şifre" type="password" onChange={e => setPassword(e.target.value)} />
            <button className="bg-secondary p-2 rounded w-full" onClick={handleLogin}>Giriş Yap</button>
            <button className="underline w-full" onClick={() => setStage('register')}>Kayıt Ol</button>
          </div>
        )}

        {stage === 'register' && (
          <div className="space-y-2">
            <input className="p-2 text-black w-full" placeholder="Email" onChange={e => setEmail(e.target.value)} />
            <input className="p-2 text-black w-full" placeholder="Şifre" type="password" onChange={e => setPassword(e.target.value)} />
            <button className="bg-secondary p-2 rounded w-full" onClick={handleRegister}>Kayıt Ol</button>
            <button className="underline w-full" onClick={() => setStage('login')}>Giriş Yap</button>
          </div>
        )}

        {stage === 'generate' && (
          <div className="space-y-2">
            <input className="p-2 text-black w-full" placeholder="Prompt girin" onChange={e => setPrompt(e.target.value)} />
            <input className="p-2 text-black w-full" placeholder="Görsel yazısı" onChange={e => setText(e.target.value)} />

            <select className="p-2 text-black w-full" onChange={e => setSize(e.target.value)}>
              <option value="1080x1080">Instagram Gönderi (1:1)</option>
              <option value="1080x1920">Instagram Hikaye (9:16)</option>
              <option value="1080x1440">3:4 Dikey</option>
              <option value="1080x1350">4:5 Portre</option>
              <option value="custom">Özel Ölçü</option>
            </select>

            {size === 'custom' && (
              <div className="flex gap-2">
                <input className="p-2 text-black w-1/2" type="number" placeholder="Genişlik (px)" onChange={e => setCustomWidth(e.target.value)} />
                <input className="p-2 text-black w-1/2" type="number" placeholder="Yükseklik (px)" onChange={e => setCustomHeight(e.target.value)} />
              </div>
            )}

            <div className="flex gap-4 text-sm">
              <label><input type="radio" name="bgMode" value="ai" defaultChecked onChange={e => setBgMode(e.target.value)} /> AI Görseli</label>
              <label><input type="radio" name="bgMode" value="color" onChange={e => setBgMode(e.target.value)} /> Renk Seç</label>
              <label><input type="radio" name="bgMode" value="image" onChange={e => setBgMode(e.target.value)} /> Arka Plan Yükle</label>
            </div>

            {bgMode === 'color' && <input type="color" className="w-full" value={bgColor} onChange={e => setBgColor(e.target.value)} />}
            {bgMode === 'image' && <input type="file" className="w-full" onChange={e => setBgImage(e.target.files[0])} accept="image/*" />}

            <input type="color" value={frameColor} onChange={e => setFrameColor(e.target.value)} /> Çerçeve Rengi
            <input className="p-2 w-full" type="file" accept="image/*" onChange={e => setLogo(e.target.files[0])} />
            <select className="p-2 text-black w-full" onChange={e => setLogoPosition(e.target.value)}>
              <option value="top">Logo Üstte</option>
              <option value="bottom">Logo Altta</option>
            </select>
            <input className="p-2 w-full text-black" type="range" min="10" max="200" value={logoScale} onChange={e => setLogoScale(e.target.value)} /> Logo Boyutu: %{logoScale}

            <input className="p-2 w-full text-black" type="color" value={textColor} onChange={e => setTextColor(e.target.value)} /> Yazı Rengi
            <input className="p-2 w-full text-black" type="number" value={textSize} onChange={e => setTextSize(e.target.value)} placeholder="Yazı Boyutu (px)" />

            <select className="p-2 text-black w-full" onChange={e => setTextFont(e.target.value)}>
              {["Arial", "Helvetica", "Times New Roman", "Georgia", "Verdana", "Quicksand", "Roboto", "Tahoma", "Trebuchet MS", "Courier New"].map(f => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>

            <button className="bg-green-500 hover:bg-green-600 p-2 rounded w-full" onClick={handleGenerate} disabled={loading}>
              {loading ? 'Yükleniyor...' : 'Görsel Üret'}
            </button>

            {image && (
              <div className="space-y-2 mt-4">
                <img src={image} alt="tasarım" className="w-full rounded-lg border" />
                <a href={image} download className="bg-white text-blue-800 font-bold p-2 rounded block text-center">Görseli İndir</a>
              </div>
            )}

            <button className="bg-white text-primary font-bold p-2 rounded w-full" onClick={handleBuyCredit}>+1 Görsel (69 TL)</button>
            {paymentIframe && (
              <div className="mt-4" dangerouslySetInnerHTML={{ __html: paymentIframe }}></div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
