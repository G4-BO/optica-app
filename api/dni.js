export default async function handler(req, res) {
  const { numero } = req.query;
  if (!numero || numero.length !== 8) {
    return res.status(400).json({ error: "DNI inválido" });
  }
  try {
    const r = await fetch(`https://api.decolecta.com/v1/reniec/dni?numero=${numero}`, {
      headers: {
        Authorization: `Bearer ${process.env.RENIEC_TOKEN}`,
        Accept: "application/json",
      },
    });
    const data = await r.json();
    if (!r.ok) {
      console.error("Error Decolecta:", r.status, data);
      return res.status(r.status).json({ error: data.message || "Error consultando DNI" });
    }
    return res.status(200).json(data);
  } catch (e) {
    console.error("Excepción dni.js:", e);
    return res.status(500).json({ error: "Error consultando DNI" });
  }
}