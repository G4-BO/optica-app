export default async function handler(req, res) {
  const { numero } = req.query;
  if (!numero || numero.length !== 8) {
    return res.status(400).json({ error: "DNI inválido" });
  }
  try {
    const r = await fetch(`https://api.apis.net.pe/v2/reniec/dni?numero=${numero}`, {
      headers: {
        Authorization: "Bearer apis-token-13017.GbHs7CwRCPnWtMIRqkl0oTieSWByK6Bz",
        Accept: "application/json",
      },
    });
    const data = await r.json();
    return res.status(200).json(data);
  } catch (e) {
    return res.status(500).json({ error: "Error consultando DNI" });
  }
}