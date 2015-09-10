var GamePlayScene = function(game, stage)
{
  var self = this;

  self.dragger = new Dragger({source:stage.dispCanv.canvas});

  var HeightMap = function(w,h)
  {
    var self = this;
    self.w = w;
    self.h = h;
    self.buffs = [];
    self.buffs[0] = [];
    self.buffs[1] = [];
    for(var i = 0; i < w*h; i++) self.buffs[0][i] = Math.random();
    for(var i = 0; i < w*h; i++) self.buffs[1][i] = Math.random();
    self.buff = 0;
    self.data = self.buffs[self.buff];

    self.iFor = function(x,y) { return (y*w)+x; }
    self.anneal = function(t)
    {
      var oldb = self.buff;
      var newb = (self.buff+1)%2;
      for(var y = 0; y < h; y++)
      {
        for(var x = 0; x < w; x++)
        {
          var index = self.iFor(x,y);
          self.buffs[newb][index] = self.buffs[oldb][index];
          self.buffs[newb][index] += self.buffs[oldb][self.iFor(((x-1)+w)%w,y)];
          self.buffs[newb][index] += self.buffs[oldb][self.iFor(((x+1)+w)%w,y)];
          self.buffs[newb][index] += self.buffs[oldb][self.iFor(x,((y-1)+h)%h)];
          self.buffs[newb][index] += self.buffs[oldb][self.iFor(x,((y+1)+h)%h)];
          self.buffs[newb][index] /= 5;
          self.buffs[newb][index] = lerp(self.buffs[oldb][index],self.buffs[newb][index],t);
        }
      }
      self.buff = (self.buff+1)%2;
      self.data = self.buffs[self.buff];
    }
    self.sample = function(x,y)
    {
      x = x*self.w;
      y = y*self.h;
      var low_x  = Math.floor(x-0.5+self.w)%self.w;
      var high_x = Math.ceil( x-0.5+self.w)%self.w;
      var low_y  = Math.floor(y-0.5+self.h)%self.h;
      var high_y = Math.ceil( y-0.5+self.h)%self.h;

      var tl = self.data[self.iFor( low_x, low_y)];
      var tr = self.data[self.iFor(high_x, low_y)];
      var bl = self.data[self.iFor( low_x,high_y)];
      var br = self.data[self.iFor(high_x,high_y)];
      var t = lerp(tl,tr,(x+.5)%1);
      var b = lerp(bl,br,(x+.5)%1);

      return lerp(t,b,(y+.5)%1);
    }
    self.takeValsFromHmap = function(hmap)
    {
      for(var y = 0; y < self.h; y++)
      {
        for(var x = 0; x < self.w; x++)
        {
          var index = self.iFor(x,y);
          self.data[index] = hmap.sample(x/self.w,y/self.h);
        }
      }
    }
  }
  var VecField2d = function(w,h)
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
      for(var i = 0; i < h; i++)
      {
        for(var j = 0; j < w; j++)
        {

        }
      }
    }
  }

  var PressureSystem = function(x,y,r,delta,label,color,hmap)
  {
    var self = this;
    self.j = x;
    self.i = y;
    self.r = r;
    self.x = ((self.j/hmap.w)*stage.dispCanv.canvas.width-10)+(stage.dispCanv.canvas.width/hmap.w)/2;
    self.y = ((self.i/hmap.h)*stage.dispCanv.canvas.height-10)+(stage.dispCanv.canvas.height/hmap.h)/2;
    self.w = 20;
    self.h = 20;
    self.delta = delta;
    self.dragging = false;

    self.dragStart = function(evt)
    {
      self.dragging = true;
    }
    self.drag = function(evt)
    {
      if(self.dragging)
      {
        self.j = (evt.doX/stage.dispCanv.canvas.width*hmap.w)-0.5;
        self.i = (evt.doY/stage.dispCanv.canvas.height*hmap.h)-0.5;
        self.x = ((self.j/hmap.w)*stage.dispCanv.canvas.width-10)+(stage.dispCanv.canvas.width/hmap.w)/2;
        self.y = ((self.i/hmap.h)*stage.dispCanv.canvas.height-10)+(stage.dispCanv.canvas.height/hmap.h)/2;
      }
    }
    self.dragFinish = function(evt)
    {
      self.dragging = false;
    }

    self.draw = function(canv)
    {
      canv.context.fillStyle = color;
      canv.context.fillText(label,self.x+self.w/2-10,self.y+self.h/2+10);
      canv.context.strokeRect(self.x,self.y,self.w,self.h);
    }
  }

  self.hmap;
  self.vfield;
  self.hpress;
  self.lpress;

  self.ready = function()
  {
    stage.drawCanv.context.font = "30px arial";
    self.lowfhmap = new HeightMap(10,10);
    self.hmap = new HeightMap(20,20);
    self.hmap.takeValsFromHmap(self.lowfhmap);
    self.hmap.anneal(1);
    self.hmap.anneal(1);
    self.hmap.anneal(1);
    self.hmap.anneal(1);

    self.hpress = new PressureSystem(self.hmap.w*.2,self.hmap.h*.2,100,5,"H","#000000",self.hmap);
    self.lpress = new PressureSystem(self.hmap.w*.6,self.hmap.h*.6,100,-5,"L","#FFFFFF",self.hmap);

    self.dragger.register(self.hpress);
    self.dragger.register(self.lpress);

    self.vfield = new VecField2d(10,10);
  };

  self.ticks = 0;
  self.tick = function()
  {
    for(var i = 0; i < self.hmap.h; i++)
    {
      for(var j = 0; j < self.hmap.w; j++)
      {
        var index = self.hmap.iFor(j,i);

        var xd = j-self.hpress.j;
        var yd = i-self.hpress.i;
        var d = xd*xd + yd*yd / self.hpress.r*self.hpress.r;
        if(d < 1) self.hmap.data[index] += (1-d)*self.hpress.delta;

        var xd = j-self.lpress.j;
        var yd = i-self.lpress.i;
        var d = xd*xd + yd*yd / self.lpress.r*self.lpress.r;
        if(d < 1) self.hmap.data[index] += (1-d)*self.lpress.delta;

        if(self.hmap.data[index] > 1) self.hmap.data[index] = 1;
        if(self.hmap.data[index] < 0) self.hmap.data[index] = 0;
      }
    }
    self.hmap.anneal(1);

    var tl;
    var tr;
    var bl;
    var br;
    var theta;
    var desiredtheta;
    var newtheta;
    for(var i = 0; i < self.vfield.h; i++)
    {
      for(var j = 0; j < self.vfield.w; j++)
      {
        var index = self.vfield.iFor(j,i);
        theta = Math.atan2(self.vfield.data[index+1],self.vfield.data[index]);
        if(theta < 0) theta += 2*Math.PI;
        tl = self.hmap.sample((j-1)/self.vfield.w,(i-1)/self.vfield.h);
        tr = self.hmap.sample((j+1)/self.vfield.w,(i-1)/self.vfield.h);
        bl = self.hmap.sample((j-1)/self.vfield.w,(i+1)/self.vfield.h);
        br = self.hmap.sample((j+1)/self.vfield.w,(i+1)/self.vfield.h);

             if(tl <= tl && tl <= tr && tl <= bl && tl <= br) desiredtheta = Math.PI*7/4;
        else if(tr <= tl && tr <= tr && tr <= bl && tr <= br) desiredtheta = Math.PI*1/4;
        else if(bl <= tl && bl <= tr && bl <= bl && bl <= br) desiredtheta = Math.PI*5/4;
        else if(br <= tl && br <= tr && br <= bl && br <= br) desiredtheta = Math.PI*3/4;

        newtheta = lerp(theta,desiredtheta,0.1);
        self.vfield.data[index]   = Math.cos(newtheta)*20;
        self.vfield.data[index+1] = Math.sin(newtheta)*20;
      }
    }

    self.dragger.flush();
    if(self.lpress.dragging) self.hpress.dragging = false;
    self.ticks++;
  };

  self.draw = function()
  {
    var canv = stage.drawCanv;
    canv.context.lineWidth = 0.5;

    var x_space;
    var y_space;
    var x;
    var y;
    var index;

    x_space = canv.canvas.width / self.hmap.w;
    y_space = canv.canvas.height / self.hmap.h;
    for(var i = 0; i < self.hmap.h; i++)
    {
      for(var j = 0; j < self.hmap.w; j++)
      {
        y = y_space*i;
        x = x_space*j;
        index = self.hmap.iFor(j,i);
        var color = Math.round(self.hmap.data[index]*255);
        canv.context.fillStyle = "rgba("+color+","+color+","+color+",1)";
        canv.context.fillRect(x,y,x_space,y_space);
      }
    }

    var tl;
    var tr;
    var bl;
    var br;
    for(var l = 0; l < 1; l+=0.2)
    {
      for(var i = 0; i < self.hmap.h; i++)
      {
        for(var j = 0; j < self.hmap.w; j++)
        {
          y = y_space*i;
          x = x_space*j;
          tl = self.hmap.data[self.hmap.iFor(j  ,i  )] < l;
          tr = self.hmap.data[self.hmap.iFor(j+1,i  )] < l;
          bl = self.hmap.data[self.hmap.iFor(j  ,i+1)] < l;
          br = self.hmap.data[self.hmap.iFor(j+1,i+1)] < l;
          self.squareMarch(tl,tr,bl,br,x+x_space/2,y+y_space/2,x_space,y_space,canv);
        }
      }
    }

    x_space = canv.canvas.width / self.vfield.w;
    y_space = canv.canvas.height / self.vfield.h;
    for(var i = 0; i < self.vfield.h; i++)
    {
      for(var j = 0; j < self.vfield.w; j++)
      {
        y = y_space*i+(y_space/2);
        x = x_space*j+(x_space/2);
        index = self.vfield.iFor(j,i);
        canv.context.strokeStyle = "#ff0000";
        canv.context.strokeRect(x-0.5,y-0.5,1,1);
        canv.context.strokeStyle = "#000000";
        canv.drawLine(x,y,x+self.vfield.data[index],y+self.vfield.data[index+1]);
      }
    }

    self.hpress.draw(canv);
    self.lpress.draw(canv);
  };

  self.cleanup = function()
  {
  };

  //holy ugly
  self.squareMarch = function(tl,tr,bl,br,x,y,w,h,canv)
  {
    if(tl) //reverse all, cuts if's in half
    {
      if(!tr && !bl && br) //only non-reversable case
      {
        canv.drawLine(x,y+h/2,x+w/2,y); //1001
        canv.drawLine(x+w/2,y+h,x+w,y+h/2);
        return;
      }
      tl = !tl;
      tr = !tr;
      bl = !bl;
      br = !br;
    }

    if(!tr)
    {
      if(!bl)
      {
        if(!br) {} //0000
        else canv.drawLine(x+w/2,y+h,x+w,y+h/2); //0001
      }
      else
      {
        if(!br) canv.drawLine(x,y+h/2,x+w/2,y+h); //0010
        else    canv.drawLine(x,y+h/2,x+w,y+h/2); //0011
      }
    }
    else
    {
      if(!bl)
      {
        if(!br) canv.drawLine(x+w/2,y,x+w,y+h/2); //0100
        else canv.drawLine(x+w/2,y,x+w/2,y+h); //0101
      }
      else
      {
        if(!br)
        {
          canv.drawLine(x+w/2,y,x+w,y+h/2); //0110
          canv.drawLine(x,y+h/2,x+w/2,y+h);
        }
        else canv.drawLine(x,y+h/2,x+w/2,y); //0111
      }
    }

  }

};

