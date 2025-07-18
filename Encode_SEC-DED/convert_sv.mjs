// === ENCODE ===

// CLI commands:
// node convert_sv.mjs
// python3 -m http.server

import { process_sv } from 'yosys2digitaljs';
import fs from 'fs';

import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

const rl = readline.createInterface({ input, output });

let int_width; 

while(1) {
  const widthStr = await rl.question('\nEnter the number of bits (for input) you would like:\n');
  int_width = parseInt(widthStr, 10);
  if (Number.isInteger(int_width) && int_width > 0) {
    break
  } else {
    console.log("/!\\ Invalid number of bits entered. /!\\")
  }
}

const width = int_width

rl.close();

// Compute minimum number of check bits needed. 

function computeCheckBits(m) {
  let r = 0;
  while ((1 << r) < (m + r + 1)) r++;
  return r;
}

const checkBits = computeCheckBits(width);

// System Verilog code for encoding message bits for SEC-DED. 

const sv_code = `
module pow2_detect
  #(
    parameter int WIDTH = ${width},
    parameter int CHECK_BITS = ${checkBits},
    parameter int NUM_BITS = CHECK_BITS + WIDTH,
    parameter int NUM_BITS_PARITY = NUM_BITS + 1
  )
  (
    input  logic [WIDTH-1:0] in_bits,
    // output logic [NUM_BITS-1:0] out_bits,
    output logic [NUM_BITS_PARITY-1:0] xor_pow2_bits
  );

  logic [NUM_BITS-1:0] out_bits;

  // Reversed version of bits (to print out properly), plus one extra bit (parity bit) for SEC-DED.
  logic [NUM_BITS_PARITY-1:0] r_out_bits;
  integer input_idx;

  // === Add check bits to input message bits. ===
  integer xor_val;
  integer idx_bit;

  always_comb begin
      input_idx = WIDTH - 1;
      out_bits = '0;
      for (integer i = 1; i <= NUM_BITS; i = i + 1) begin
          if ((i & (i - 1)) == 0)
              out_bits[i-1] = 0; // parity bits set to default value
          else if (input_idx < WIDTH) begin
              out_bits[i-1] = in_bits[input_idx];
              input_idx--;
          end
      end

      // Compute and assign parity bits
      for (integer i = 0; i < CHECK_BITS; i++) begin
        idx_bit = 1 << i;
        xor_val = 0;
        for (int j = 1; j <= NUM_BITS; j++) begin
          if ((j & idx_bit) && (j != idx_bit - 1)) begin
                xor_val ^= out_bits[j-1];
          end
        end
        out_bits[idx_bit - 1] = xor_val;
      end

      xor_val = 0;
      // Reverse order of output bits (to show on screen better)
      // Also, place the parity bit (last binary digit) by XOR'ing all other values.
      for (int i = 0; i < NUM_BITS; i++) begin
          xor_val ^= out_bits[i];
          r_out_bits[NUM_BITS_PARITY-1 - i] = out_bits[i];
      end
      r_out_bits[0] = xor_val;

  end
  assign xor_pow2_bits = r_out_bits;

endmodule
`;

// Convert System Verilog code into .json 

// NOTE: This will allow the circuit.json file produced using the System Verilog code 
// to appear as a circuit on a local server using `yosys2digitaljs`. 
// This local server will work using the files `main.js` and `index.html`, where 
// main.js will use digitaljs (from yosys2digitaljs) to translate circuit.json into circuits.
// Also, index.html uses main.js to allow the local server to appear (using local host).

process_sv(sv_code).then(result => {
  fs.writeFileSync('circuit.json', JSON.stringify(result.output, null, 2));
  console.log('Circuit saved to circuit.json');
});

