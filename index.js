class FeedbackButton {
  constructor() {
    this.button = this.createButton();
    this.screenshotCanvas = new ScreenshotCanvas();
    this.attachEvents();
  }

  createButton() {
    const button = document.createElement("button");
    button.textContent = "Feedback";
    button.style.position = "fixed";
    button.style.bottom = "20px";
    button.style.right = "20px";
    return button;
  }

  attachEvents() {
    this.button.addEventListener("click", () => {
      this.openFeedbackPopup();
    });
    document.body.appendChild(this.button);
  }

  async openFeedbackPopup() {
    await this.screenshotCanvas.captureScreen();
    const popup = new FeedbackPopup(this.screenshotCanvas);
    popup.display();
  }
}
class ScreenshotCanvas {
  constructor() {
    this.canvas = document.createElement("canvas");
    this.context = this.canvas.getContext("2d");
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.colors = [
      "black",
      "red",
      "blue",
      "green",
      "yellow",
      "orange",
      "purple",
    ];
    this.currentColor = "black";
    this.currentLineWidth = 5;
    this.context.lineWidth = this.currentLineWidth;
    this.attachEvents();

    this.undoStack = [];
    this.redoStack = [];
  }

  attachEvents() {
    this.canvas.addEventListener("mousedown", this.startDrawing.bind(this));
    this.canvas.addEventListener("mousemove", this.draw.bind(this));
    this.canvas.addEventListener("mouseup", this.stopDrawing.bind(this));
    this.canvas.addEventListener("mouseout", this.stopDrawing.bind(this));
    window.addEventListener("keydown", this.handleKeyPress.bind(this));
    this.drawing = false;
  }

  saveState() {
    const dataUrl = this.canvas.toDataURL();
    this.undoStack.push(dataUrl);
    if (this.undoStack.length > 30) this.undoStack.shift();
    this.redoStack = [];
  }

  restoreState(dataUrl, save = true) {
    const img = new Image();
    img.onload = () => {
      this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
      this.context.drawImage(img, 0, 0, this.canvas.width, this.canvas.height);
    };
    img.src = dataUrl;
    if (save) this.redoStack.push(this.undoStack.pop());
  }

  undo() {
    if (this.undoStack.length > 1) {
      this.restoreState(this.undoStack[this.undoStack.length - 2]);
      this.undoStack.pop();
    }
  }

  redo() {
    if (this.redoStack.length > 0) {
      const dataUrl = this.redoStack.pop();
      const img = new Image();
      img.onload = () => {
        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.context.drawImage(img, 0, 0);
        this.undoStack.push(dataUrl);
      };
      img.src = dataUrl;
    }
  }

  handleKeyPress(event) {
    const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;

    if ((isMac ? event.metaKey : event.ctrlKey) && event.key === "z") {
      event.preventDefault();
      this.undo();
    }
    if (
      (isMac ? event.metaKey : event.ctrlKey) &&
      event.shiftKey &&
      (event.key === "Z" || event.key === "z")
    ) {
      event.preventDefault();
      this.redo();
    }
  }

  getMousePosition(event) {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) * (this.canvas.width / rect.width),
      y: (event.clientY - rect.top) * (this.canvas.height / rect.height),
    };
  }

  startDrawing(event) {
    this.drawing = true;
    const pos = this.getMousePosition(event);
    this.context.beginPath();
    this.context.moveTo(pos.x, pos.y);
  }

  draw(event) {
    if (!this.drawing) return;
    const pos = this.getMousePosition(event);
    this.context.lineTo(pos.x, pos.y);
    this.context.stroke();
  }

  stopDrawing(event) {
    if (this.drawing) {
      this.drawing = false;
      this.context.stroke();
      this.saveState();
    }
  }

  changeColor(color) {
    this.currentColor = color;
    this.context.strokeStyle = color;
    this.context.globalCompositeOperation = "source-over";
  }

  activateEraser() {
    this.context.globalCompositeOperation = "destination-out";
    this.context.strokeStyle = "rgba(0,0,0,1)";
  }

  changeLineWidth(newWidth) {
    this.currentLineWidth = newWidth;
    this.context.lineWidth = newWidth;
  }

  captureScreen() {
    html2canvas(document.body).then((canvas) => {
      const tempCanvas = document.createElement("canvas");
      const tempCtx = tempCanvas.getContext("2d");
      tempCanvas.width = canvas.width;
      tempCanvas.height = canvas.height;

      tempCtx.drawImage(canvas, 0, 0);

      this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);

      this.canvas.width = canvas.width;
      this.canvas.height = canvas.height;

      this.context.drawImage(tempCanvas, 0, 0);

      this.context.lineWidth = 2;
      this.context.strokeStyle = "red";
    });
  }

  getScreenshotAsDataURL() {
    return this.canvas.toDataURL("image/png");
  }
}

class FeedbackPopup {
  constructor(screenshotCanvas) {
    this.screenshotCanvas = screenshotCanvas;
    this.popup = this.createPopup();
    this.form = new FeedbackForm(this.screenshotCanvas);
    this.createColorPalette();
    this.createLineWidthSlider();
  }

  createColorPalette() {
    const palette = document.createElement("div");
    palette.style.position = "absolute";
    palette.style.bottom = "10px";
    palette.style.left = "10px";
    palette.style.padding = "5px";
    palette.style.border = "1px solid #ccc";
    palette.style.borderRadius = "5px";
    palette.style.display = "flex";

    this.screenshotCanvas.colors.forEach((color) => {
      const colorButton = document.createElement("button");
      colorButton.style.backgroundColor = color;
      colorButton.style.width = "30px";
      colorButton.style.height = "30px";
      colorButton.style.border = "none";
      colorButton.style.marginRight = "5px";
      colorButton.style.borderRadius = "50%";
      colorButton.onclick = () => this.screenshotCanvas.changeColor(color);
      palette.appendChild(colorButton);
    });

    const eraserButton = document.createElement("button");
    eraserButton.textContent = "Eraser";
    eraserButton.style.width = "60px";
    eraserButton.style.height = "30px";
    eraserButton.style.borderRadius = "5px";
    eraserButton.style.marginLeft = "5px";
    eraserButton.onclick = () => this.screenshotCanvas.activateEraser();
    palette.appendChild(eraserButton);

    this.popup.appendChild(palette);
  }

  createLineWidthSlider() {
    const sliderContainer = document.createElement("div");
    sliderContainer.style.position = "absolute";
    sliderContainer.style.top = "10px";
    sliderContainer.style.right = "10px";
    sliderContainer.style.padding = "5px";
    sliderContainer.style.border = "1px solid #ccc";
    sliderContainer.style.borderRadius = "5px";

    const slider = document.createElement("input");
    slider.type = "range";
    slider.min = "1";
    slider.max = "20";
    slider.value = this.screenshotCanvas.currentLineWidth;
    slider.oninput = (e) =>
      this.screenshotCanvas.changeLineWidth(e.target.value);

    const sliderLabel = document.createElement("label");
    sliderLabel.textContent = "Çizgi Kalınlığı: ";
    sliderLabel.appendChild(slider);

    sliderContainer.appendChild(sliderLabel);
    this.popup.appendChild(sliderContainer);
  }

  createPopup() {
    const popup = document.createElement("div");
    popup.style.position = "fixed";
    popup.style.top = "50%";
    popup.style.left = "50%";
    popup.style.transform = "translate(-50%, -50%)";
    popup.style.width = "80%";
    popup.style.height = "80%";
    popup.style.backgroundColor = "#fff";
    popup.style.boxShadow = "0 4px 6px rgba(0,0,0,0.1)";
    popup.style.borderRadius = "8px";
    popup.style.display = "flex";
    document.body.appendChild(popup);
    return popup;
  }

  display() {
    this.popup.appendChild(this.screenshotCanvas.canvas);
    this.popup.appendChild(this.form.form);
  }
}

class FeedbackForm {
  constructor(screenshotCanvas) {
    this.form = this.createForm();
    this.screenshotCanvas = screenshotCanvas;
    this.attachEvents();
  }

  createForm() {
    const form = document.createElement("form");
    form.style.width = "50%";
    form.style.padding = "20px";
    form.innerHTML = `
            <div>
                <label for="firstName">Firstname:</label>
                <input type="text" id="firstName" name="firstName" required>
            </div>
            <div>
                <label for="lastName">Lastname:</label>
                <input type="text" id="lastName" name="lastName" required>
            </div>
            <div>
                <label for="email">E-posta Adresi:</label>
                <input type="email" id="email" name="email" required>
            </div>
            <div>
                <label for="subject">Subject:</label>
                <input type="text" id="subject" name="subject" required>
            </div>
            <div>
                <label for="description">Description:</label>
                <textarea id="description" name="description" required></textarea>
            </div>
            <div>
                <button type="button" id="cancelButton">Cancel</button>
                <button type="submit" id="submitButton">Send</button>
            </div>
        `;
    return form;
  }

  attachEvents() {
    this.form.addEventListener("submit", this.handleSubmit.bind(this));
    this.form
      .querySelector("#cancelButton")
      .addEventListener("click", this.handleCancel.bind(this));
  }

  handleSubmit(event) {
    event.preventDefault();
    const screenshotData = this.screenshotCanvas.getScreenshotAsDataURL();
    const data = {
      firstName: this.form.firstName.value,
      lastName: this.form.lastName.value,
      email: this.form.email.value,
      subject: this.form.subject.value,
      description: this.form.description.value,
      screenshot: screenshotData,
    };
    console.log("Form data with screenshot:", data);
    this.closePopup();
  }

  handleCancel(event) {
    event.preventDefault();
    this.closePopup();
  }

  closePopup() {
    document.body.removeChild(this.form.parentNode);
  }
}

new FeedbackButton();
