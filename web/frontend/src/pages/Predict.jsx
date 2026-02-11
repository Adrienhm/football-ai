import { useState } from "react";
import { api } from "../services/api";

function Predict() {
  const [result, setResult] = useState("");

  const predict = async () => {
    const res = await api.post("/predict", {
      strengthA: 70,
      strengthB: 60
    });
    setResult(res.data.prediction);
  };

  return (
    <div>
      <h2>Prédiction</h2>
      <button onClick={predict}>Lancer prédiction</button>
      <p>{result}</p>
    </div>
  );
}

export default Predict;
