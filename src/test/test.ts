import { timeout, TimeoutPromise } from '../index';

class Tests {
    static async execute() {
        let tests = new Tests();
        for(const t of Object.getOwnPropertyNames(Tests.prototype)){        
            if (t === "constructor") continue;
            console.log("Starting test \"" + t + "\"");
            await tests[t]();
            console.log("Completed test \"" + t + "\"");
            console.log("");
        }
    }

    async  testTimeout() {
        let timedout = false;
        await timeout(
            (): boolean => {
                return false;
            },
            () => {
                timedout = true;
                Tests.logPassed("Timed-out as expected.")
            },
            1000);

        if (!timedout)
            Tests.logFailed("Failed to time-out.")
    }

    async  testCancelTimeout() {
        let timedout = false;
        await timeout(
            (): boolean => {
                return true;
            },
            () => {
                timedout = true;
                Tests.logFailed("Timed-out")
            },
            10000);

        if (!timedout)
            Tests.logPassed("Completed without timing-out.")
    }

    async  testTimeoutCancelFnError() {
        await timeout(
            (): boolean => {
                throw new Error("TEST");
            },
            () => {
                Tests.logFailed("Timed-out.")
            },
            1000).catch((reason) => {
                if (reason.message == "TEST")
                    Tests.logPassed("TEST error captured")
                else
                    Tests.logFailed("Unexpected error.")
            });
    }

    async  testTimeoutTimeoutFnError() {
        await timeout(
            (): boolean => {
                return false;
            },
            () => {
                throw new Error("TEST");
            },
            1000).catch((reason) => {
                if (reason.message == "TEST")
                    Tests.logPassed("TEST error captured")
                else
                    Tests.logFailed("Unexpected error.")
            });
    }

    async  testTimeoutPromise() {
        await new TimeoutPromise<string>(async (resolve, reject) => {
            console.log("Sleeping for 1 second")
            setTimeout(() => {
                console.log("Resolving");
                resolve("success");
            }, 1000);
        }, 5000)
            .then(() => { Tests.logPassed("The promise resolved before the timeout."); })
            // A timeout WILL raise an error that must be handled by this promise, a parent promise, or a try/catch clause.
            .catch((reason) => {
                Tests.logFailed(reason.message);
                Tests.logRejectedPromise(reason);
            });
    }

    async testTimeoutPromiseTimeout() {
        await new TimeoutPromise<string>((resolve, reject) => { }, 500)
            .then(() => { Tests.logFailed("The promise resolved without timing-out."); })
            // A timeout WILL raise an error that must be handled by this promise, a parent promise, or a try/catch clause.
            .catch((reason) => {
                if (reason.isTimeoutException)
                    Tests.logPassed("The Promise timed-out.");
                else
                    Tests.logFailed("Unexpected error.")

                Tests.logRejectedPromise(reason);
            });
    }

    static logPassed(message: string) {
        console.log("PASSED: " + message);
    }

    static logFailed(message: string) {
        console.log("FAILED: " + message);
    }

    static logRejectedPromise(reason) {
        console.log("The Promise was rejected with the following message:");
        console.log('"' + reason.message + '"');
    }
}

Tests.execute();
