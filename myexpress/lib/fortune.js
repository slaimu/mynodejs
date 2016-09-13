
var testArray = [
  "1",
  "2",
  "3"
];


exports.getFortune = function () {
  var idx = Math.floor(Math.random() * testArray.length);
  return testArray[idx];
};
