// Modified from https://observablehq.com/@mbostock/scrubber

function Scrubber(
  el,
  values,
  {
    format = (value) => value,
    initial = 0,
    delay = null,
    autoplay = true,
    loop = true,
    loopDelay = null,
    alternate = false,
  } = {}
) {
  values = Array.from(values);
  el.innerHTML = /*html*/ `<form
    class="scrubber"
  >
    <button
      class="scrubber__button"
      name="b"
      type="button"
    ></button>
    <label class="scrubber__label">
      <input
        class="scrubber__input"
        name="i"
        type="range"
        min="0"
        max=${values.length - 1}
        value=${initial}
        step="1"
      />
      <output class="scrubber__output" name="o"></output>
    </label>
  </form>`;
  const form = el.querySelector("form");
  let frame = null;
  let timer = null;
  let interval = null;
  let direction = 1;
  function start() {
    form.b.textContent = "Pause";
    if (delay === null) frame = requestAnimationFrame(tick);
    else interval = setInterval(tick, delay);
  }
  function stop() {
    form.b.textContent = "Play";
    if (frame !== null) cancelAnimationFrame(frame), (frame = null);
    if (timer !== null) clearTimeout(timer), (timer = null);
    if (interval !== null) clearInterval(interval), (interval = null);
  }
  function running() {
    return frame !== null || timer !== null || interval !== null;
  }
  function tick() {
    if (
      form.i.valueAsNumber ===
      (direction > 0 ? values.length - 1 : direction < 0 ? 0 : NaN)
    ) {
      if (!loop) return stop();
      if (alternate) direction = -direction;
      if (loopDelay !== null) {
        if (frame !== null) cancelAnimationFrame(frame), (frame = null);
        if (interval !== null) clearInterval(interval), (interval = null);
        timer = setTimeout(() => (step(), start()), loopDelay);
        return;
      }
    }
    if (delay === null) frame = requestAnimationFrame(tick);
    step();
  }
  function step() {
    form.i.valueAsNumber =
      (form.i.valueAsNumber + direction + values.length) % values.length;
    form.i.dispatchEvent(new CustomEvent("input", { bubbles: true }));
  }
  form.i.oninput = (event) => {
    if (event && event.isTrusted && running()) stop();
    form.value = values[form.i.valueAsNumber];
    form.o.value = format(form.value, form.i.valueAsNumber, values);
  };
  form.b.onclick = () => {
    if (running()) return stop();
    direction =
      alternate && form.i.valueAsNumber === values.length - 1 ? -1 : 1;
    form.i.valueAsNumber = (form.i.valueAsNumber + direction) % values.length;
    form.i.dispatchEvent(new CustomEvent("input", { bubbles: true }));
    start();
  };
  form.i.oninput();
  if (autoplay) start();
  else stop();
  return form;
}
