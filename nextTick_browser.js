// browser version of nextTick
module.exports = function(fn) {
    setTimeout(fn, 0);
};