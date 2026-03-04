const API_URL = window.APP_CONFIG.API_BASE_URL;

fetch(`${API_URL}/callers`)
  .then(res => res.json())
  .then(data => {
    const list = document.getElementById("callers");

    data.forEach(item => {
      const li = document.createElement("li");
      li.innerText =
        item.callerNumber.S +
        " - " +
        JSON.parse(item.vanityNumbers.S).join(", ");
      list.appendChild(li);
    });
  })
  .catch(err => {
    console.error("Error loading callers:", err);
  });