console.log('nex-pedantic');

// try to break node > 0.10. will work in 0.8
["SIGINT", "SIGHUP", "SIGQUIT", "SIGKILL", "SIGSEGV", "SIGILL"].forEach(function (sig) {
  process.once(sig, function () { });
});
