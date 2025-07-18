fetch('circuit.json')
  .then(res => res.json())
  .then(json => {
    const circuit = new digitaljs.Circuit(json);
    circuit.displayOn($('#paper'));
    circuit.start();
  });

