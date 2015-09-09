var ptWithin = function(ptx, pty, x, y, w, h)
{
  return (ptx >= x && ptx <= x+w && pty >= y && pty <= y+h);
}
var ptWithinObj = function(ptx, pty, obj)
{
  return ptWithin(ptx, pty, obj.x, obj.y, obj.w, obj.h);
}
var objWithinObj = function(obja, objb)
{
  console.log("not done!");
  return false;
}
var ptNear = function(ptx, pty, x, y, r)
{
  var w2 = (ptx-x)*(ptx-x);
  var h2 = (pty-y)*(pty-y);
  var d2 = r*r;
  return w2+h2 < d2;
}

