document.addEventListener("DOMContentLoaded", function () {

  const botones = document.querySelectorAll(".menu button");
  const paneles = document.querySelectorAll(".panel");

  botones.forEach(boton => {
    boton.addEventListener("click", function () {

      // Quitar clase active de todos
      botones.forEach(b => b.classList.remove("active"));

      // Ocultar todos los paneles
      paneles.forEach(panel => panel.classList.remove("visible"));

      // Activar botón clickeado
      this.classList.add("active");

      // Mostrar panel correspondiente
      const id = this.getAttribute("data-panel");
      document.getElementById(id).classList.add("visible");

    });
  });

});