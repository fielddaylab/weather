var GamePlayScene = function(game, stage)
{
  var self = this;

  var Field2d = function(w,h)
  {
    var self = this;
    self.w = w;
    self.h = h;
    self.data = [];
    for(var i = 0; i < w*h*2; i++)
    {
      if(i%2)
        self.data[i] = Math.sin(i/200)*5;
      else
        self.data[i] = Math.cos(i/200)*5;
    }

    self.iFor = function(x,y) { return (y*(w*2))+(x*2); }
    self.applyForce = function(xs,ys,xe,ye)
    {

    }
  }

  self.field;











  self.ready = function()
  {
    self.field = new Field2d(50,50);
  };

  self.tick = function()
  {
  };

  self.draw = function()
  {
    var canv = stage.drawCanv;
    var x_space = canv.canvas.width / self.field.w;
    var y_space = canv.canvas.height / self.field.h;
    var x;
    var y;
    var index;
    canv.context.lineWidth = 0.5;
    for(var i = 0; i < self.field.h; i++)
    {
      for(var j = 0; j < self.field.w; j++)
      {
        y = y_space*i;
        x = x_space*j;
        index = self.field.iFor(j,i);
        canv.context.strokeStyle = "#ff0000";
        //if(i == 10 && j == 10)
        canv.context.strokeRect(x-0.5,y-0.5,1,1);
        canv.context.strokeStyle = "#000000";
        canv.drawLine(x,y,x+self.field.data[index],y+self.field.data[index+1]);
      }
    }
  };

  self.cleanup = function()
  {
  };

};

