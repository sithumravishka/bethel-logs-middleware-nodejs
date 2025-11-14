// index.js

const crypto = require('crypto');

// ---------------------- Module Code ---------------------- //

/**
 * Simulates obtaining an API instance.
 * Replace this with your actual on-chain API initialization if needed.
 * @param {string} traceId - The trace identifier.
 * @returns {Promise<Object>} A simulated API instance.
 */
async function getApiInstance(traceId) {
  // Simulate an API instance with an RPC call that returns a header.
  return {
    rpc: {
      chain: {
        getHeader: async () => {
          // Simulate a block header with a 'number' field.
          return {
            number: {
              // For simulation, return a block number based on the current timestamp (seconds) modulo 100000.
              toNumber: () => Math.floor(Date.now() / 1000) % 100000,
            },
          };
        },
      },
    },
  };
}

/**
 * Logs debug messages.
 * @param {string} traceId - The trace identifier.
 * @param {string} message - The debug message.
 */
function debugLog(traceId, message) {
  console.log(`[DEBUG][${traceId}]: ${message}`);
}

/**
 * Logs error messages.
 * @param {string} traceId - The trace identifier.
 * @param {string} message - The error message.
 */
function errorLog(traceId, message) {
  console.error(`[ERROR][${traceId}]: ${message}`);
}

/**
 * Generates a unique invoice number using on-chain data along with the user DID,
 * paid address, current block number, a high-resolution timestamp, and a crypto-based random element.
 *
 * @param {object} params
 * @param {string} params.did - The user DID.
 * @param {string} params.paid_address - The address used for payment.
 * @param {string} params.traceId - The trace identifier for logging.
 * @returns {Promise<string>} A promise that resolves with a unique invoice number.
 */
async function generateUniqueInvoiceNo({ did, paid_address, traceId }) {
  try {
    const api = await getApiInstance(traceId);
    const header = await api.rpc.chain.getHeader();
    const blockNumber = header.number.toNumber();
    // Truncate the paid address to its first 5 characters for brevity.
    const paidAddressShort = paid_address.slice(0, 5);
    // Use crypto.randomBytes to generate a unique random hexadecimal string.
    const randomHex = crypto.randomBytes(4).toString('hex');
    // Use process.hrtime() for a high-resolution timestamp.
    const [seconds, nanoseconds] = process.hrtime();
    const highResTime = seconds * 1e9 + nanoseconds;
    // Construct the invoice number.
    const invoiceNo = `INV-${did.slice(0, 5)}-${paidAddressShort}-${blockNumber}-${highResTime}-${randomHex}`;
    debugLog(traceId, `Generated unique invoice number: ${invoiceNo}`);
    return invoiceNo;
  } catch (error) {
    errorLog(traceId, `Error generating invoice number: ${error.message}`);
    throw new Error(`Error generating invoice number: ${error.message}`);
  }
}

// ---------------------- Test Code ---------------------- //

// Dummy parameters for testing
const did = 'did:example:123456789abcdef';
const paid_address = '0xABCDEF1234567890';
const traceId = 'testTrace';

/**
 * Generates a specified number of invoice numbers concurrently.
 * @param {number} count - The number of invoices to generate.
 * @returns {Promise<string[]>} A promise that resolves with an array of generated invoice numbers.
 */
async function generateInvoices(count) {
  const promises = [];
  for (let i = 0; i < count; i++) {
    promises.push(generateUniqueInvoiceNo({ did, paid_address, traceId }));
  }
  return Promise.all(promises);
}

/**
 * Runs the test by generating invoice numbers, checking for duplicates,
 * and then generating an additional invoice ID.
 */
async function runTest() {
  try {
    console.log('Starting invoice generation test...');

    // Generate 100 invoice numbers concurrently.
    const invoices = await generateInvoices(10000);
    console.log(`Generated ${invoices.length} invoice numbers.`);

    // Check for duplicates by comparing the array length to the Set size.
    const uniqueInvoices = new Set(invoices);
    if (uniqueInvoices.size === invoices.length) {
      console.log('All invoice numbers are unique.');
    } else {
      console.error('Duplicate invoice numbers found!');
      // Optionally, find and log the duplicates.
      const duplicates = invoices.filter(
        (item, index) => invoices.indexOf(item) !== index
      );
      console.error('Duplicates:', duplicates);
    }

    // Generate an additional invoice ID after the test.
    const additionalInvoice = await generateUniqueInvoiceNo({ did, paid_address, traceId });
    console.log('Generated additional invoice ID:', additionalInvoice);
  } catch (error) {
    console.error('Error during invoice generation test:', error);
  }
}

// Run the test.
runTest();
