const assert = require('assert')
assert(true)
assert(1)

/*
assert(false);
assert(0)
assert(false, 'It\'s false')
*/


assert.deepEqual(Error('a'), Error('b'));



const obj1 = {
  a: {
    b: 1
  }
  
};

const obj2 = {
  a: {
    b: 2
  }
};


const obj3 = {
  a: {
    b: 1
  }
};


const obj4 = Object.create(obj1);

assert.deepEqual(obj1, obj1);


/*
  assert.deepEqual(obj1, obj2);
  AssertionError: { a: { b: 1 } } deepEqual { a: { b: 2 } }
  values of b are different
*/
assert.deepEqual(obj1, obj3);
// OK, objects are equal
/*
assert.deepEqual(obj1, obj4);
*/
