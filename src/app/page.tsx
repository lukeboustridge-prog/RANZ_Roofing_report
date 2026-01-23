export default function Home() {
  console.log("=== HOME PAGE RENDERING ===");
  console.log("Time:", new Date().toISOString());

  return (
    <div style={{ padding: "50px", textAlign: "center" }}>
      <h1>RANZ Roofing Reports</h1>
      <p>If you can see this, the app is working.</p>
      <p>Rendered at: {new Date().toISOString()}</p>
    </div>
  );
}
