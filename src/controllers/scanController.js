require('dotenv').config();

// Controller untuk menangani endpoint /api/scan
exports.processReceipt = async (req, res) => {
  try {
    const { image } = req.body; // Gambar base64 yang dikirim dari Frontend

    if (!image) {
      return res.status(400).json({
        success: false,
        message: 'Gambar tidak ditemukan dalam request. Pastikan mengirim { "image": "base64..." }'
      });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const prompt = `Ekstrak informasi dari nota belanja ini. 
Kembalikan HANYA dalam format JSON murni (tanpa blockquote markdown \`\`\`json) dengan struktur berikut:
{
  "toko": "Nama Toko (jika tidak ada isi string kosong)",
  "tanggal": "Tanggal nota format DD/MM/YYYY (jika tidak ada isi string kosong)",
  "total": angka total belanja (hanya integer murni, tanpa Rp atau titik)
}
Pastikan output benar-benar hanya string JSON yang bisa di-parse.`;

    const requestBody = {
      contents: [
        {
          parts: [
            { text: prompt },
            {
              inline_data: {
                mime_type: "image/jpeg",
                data: image
              }
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.1,
        responseMimeType: "application/json",
        topK: 1,
        topP: 1
      }
    };

    // Panggil API Google Gemini
    // Catatan: Node.js 18+ sudah memiliki fitur fetch bawaan (native)
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      if (response.status === 429) {
        throw new Error('Server AI sedang sibuk (Rate Limit). Coba beberapa saat lagi.');
      }
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || 'Gagal terhubung ke Google AI API');
    }

    const data = await response.json();
    let aiText = data.candidates[0].content.parts[0].text.trim();

    // Pembersihan JSON yang ketat (Anti-Ngebug)
    const jsonMatch = aiText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      aiText = jsonMatch[0];
    } else {
      aiText = aiText.replace(/```json/g, '').replace(/```/g, ''); // Fallback
    }

    const parsedData = JSON.parse(aiText);

    // Kirim respons sukses kembali ke Frontend
    return res.status(200).json({
      success: true,
      message: 'Nota berhasil dibaca',
      data: parsedData
    });

  } catch (error) {
    console.error('Scan Controller Error:', error.message);
    return res.status(500).json({
      success: false,
      message: error.message || 'Terjadi kesalahan saat memproses nota.'
    });
  }
};
