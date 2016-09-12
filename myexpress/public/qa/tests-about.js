suite('"About" Page Tests', function () {
  test('page should contain link to connect page', function () {
    assert($('a[href="/contact"]').length);
  });
});
