const path = require("path");
const { tests } = require("@iobroker/testing");

// Run integration tests
tests.integration(path.join(__dirname, ".."), {
    allowedExitCodes: [11], // Allow exit code 11 (no connection)
    defineAdditionalTests({ suite }) {
        suite("Test adapter startup", (getHarness) => {
            it("Should start without errors", () => {
                return new Promise((resolve) => {
                    const harness = getHarness();
                    harness.startAdapterAndWait()
                        .then(() => {
                            resolve();
                        })
                        .catch((err) => {
                            // Adapter will fail to connect without ATEM, that's expected
                            if (err.message && err.message.includes("connection")) {
                                resolve();
                            } else {
                                throw err;
                            }
                        });
                });
            });
        });
    },
});
