var GamePlayScene = function(game, stage)
{
  var self = this;

  self.dragger;

  var HeightMap = function(w,h)
  {
    var self = this;
    self.w = w;
    self.h = h;
    self.buffs = [];
    self.buffs[0] = [];
    self.buffs[1] = [];
    for(var i = 0; i < w*h; i++) self.buffs[0][i] = self.buffs[1][i] = Math.random();
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
          self.data[index] = hmap.sample((x/self.w)+0.5,(y/self.h)+0.5);
        }
      }
    }
  }
  var VecField2d = function(w,h)
  {
    var self = this;
    self.w = w;
    self.h = h;
    self.dir_map = new HeightMap(w,h);
    self.len_map = new HeightMap(w,h);
    for(var i = 0; i < w*h; i++)
    {
      self.dir_map.data[i] = Math.random()*2*Math.PI;
      self.len_map.data[i] = Math.random();
    }

    self.iFor = self.dir_map.iFor;
  }

  var MapDragger = function(x,y,r,hmap)
  {
    var self = this;
    self.j = x;
    self.i = y;
    self.r = r;
    self.w = (r/hmap.w)*stage.dispCanv.canvas.width;
    self.h = (r/hmap.h)*stage.dispCanv.canvas.width;
    self.x = ((self.j/hmap.w)*stage.dispCanv.canvas.width -(self.w/2))+(stage.dispCanv.canvas.width/hmap.w)/2;
    self.y = ((self.i/hmap.h)*stage.dispCanv.canvas.height-(self.w/2))+(stage.dispCanv.canvas.height/hmap.h)/2;
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
        self.x = ((self.j/hmap.w)*stage.dispCanv.canvas.width -(self.w/2))+(stage.dispCanv.canvas.width/hmap.w)/2;
        self.y = ((self.i/hmap.h)*stage.dispCanv.canvas.height-(self.w/2))+(stage.dispCanv.canvas.height/hmap.h)/2;
      }
    }
    self.dragFinish = function(evt)
    {
      self.dragging = false;
    }
  }
  var PressureSystem = function(x,y,r,delta,label,color,pmap)
  {
    var self = new MapDragger(x,y,r,pmap);
    self.delta = delta;

    self.draw = function(canv)
    {
      canv.context.fillStyle = color;
      canv.context.fillText(label,self.x+self.w/2-10,self.y+self.h/2+10);
      canv.context.strokeRect(self.x,self.y,self.w,self.h);
    }
    return self;
  }
  var TempEmitter = function(x,y,r,delta,label,color,tmap)
  {
    var self = new MapDragger(x,y,r,tmap);
    self.delta = delta;

    self.draw = function(canv)
    {
      canv.context.fillStyle = color;
      canv.context.fillText(label,self.x+self.w/2-10,self.y+self.h/2+10);
    }
    return self;
  }

  self.tmap;
  self.temit;
  self.pmap;
  self.hpsys;
  self.lpsys;
  self.vfield;

  self.drawh = true;
  self.drawc = true;
  self.drawv = true;
  self.drawp = true;

  self.ready = function()
  {
    var cells_w = 50;
    var cells_h = 50;

    stage.drawCanv.context.font = "30px arial";
    self.dragger = new Dragger({source:stage.dispCanv.canvas});

    self.tmap = new HeightMap(cells_w,cells_h);
    self.pmap = new HeightMap(cells_w,cells_h);
    self.vfield = new VecField2d(25,25);

    self.temit = new TempEmitter(self.tmap.w*.2,self.tmap.h*.2,100,5,"T","#FF3333",self.tmap);
    self.dragger.register(self.temit);

    self.hpsys = new PressureSystem(self.pmap.w*.2,self.pmap.h*.2,4,5,"H","#FFFFFF",self.pmap);
    self.lpsys = new PressureSystem(self.pmap.w*.6,self.pmap.h*.6,4,-5,"L","#000000",self.pmap);
    self.dragger.register(self.hpsys);
    self.dragger.register(self.lpsys);

    self.pmap.anneal(1);
    self.pmap.anneal(1);
    self.pmap.anneal(1);
    self.pmap.anneal(1);
  };

  function leftw(x,w) { return ((x-1)+w)%w; };
  function rightw(x,w) { return (x+1)%w; };
  function upw(y,h) { return (y+1)%h; };
  function downw(y,h) { return ((y-1)+h)%h; };

  self.ticks = 0;
  self.tick = function()
  {
    var index;
    var ti;
    var bi;
    var li;
    var ri;

    //Emit Temp
    index = 0;
    for(var i = 0; i < self.tmap.h; i++)
    {
      for(var j = 0; j < self.tmap.w; j++)
      {
        var xd = j-self.temit.j;
        var yd = i-self.temit.i;
        var d = xd*xd + yd*yd / self.temit.r*self.temit.r;
        if(d < 1) self.tmap.data[index] += (1-(d*d*d*d))*self.temit.delta;

        if(self.tmap.data[index] > 1) self.tmap.data[index] = 1;
        if(self.tmap.data[index] < 0) self.tmap.data[index] = 0;

        index++;
      }
    }

    //Flow Temp
    index = 0;
    for(var i = 0; i < self.tmap.h; i++)
    {
      for(var j = 0; j < self.tmap.w; j++)
      {
        ti = self.tmap.iFor(j,upw(i,self.tmap.h));
        bi = self.tmap.iFor(j,downw(i,self.tmap.h));
        li = self.tmap.iFor(leftw(j,self.tmap.w),i);
        ri = self.tmap.iFor(rightw(j,self.tmap.w),i);

        if(self.tmap.data[index] > 1) self.tmap.data[index] = 1;
        if(self.tmap.data[index] < 0) self.tmap.data[index] = 0;

        index++;
      }
    }

    //Emit Pressure
    index = 0;
    for(var i = 0; i < self.pmap.h; i++)
    {
      for(var j = 0; j < self.pmap.w; j++)
      {
        var xd = j-self.hpsys.j;
        var yd = i-self.hpsys.i;
        var d = xd*xd + yd*yd / self.hpsys.r*self.hpsys.r;
        if(d < 1) self.pmap.data[index] += (1-(d*d*d*d))*self.hpsys.delta;

        var xd = j-self.lpsys.j;
        var yd = i-self.lpsys.i;
        var d = xd*xd + yd*yd / self.lpsys.r*self.lpsys.r;
        if(d < 1) self.pmap.data[index] += (1-(d*d*d*d))*self.lpsys.delta;

        if(self.pmap.data[index] > 1) self.pmap.data[index] = 1;
        if(self.pmap.data[index] < 0) self.pmap.data[index] = 0;

        index++;
      }
    }

    //Flow Pressure
    index = 0;
    for(var i = 0; i < self.pmap.h; i++)
    {
      for(var j = 0; j < self.pmap.w; j++)
      {
        ti = self.pmap.iFor(j,upw(i,self.pmap.h));
        bi = self.pmap.iFor(j,downw(i,self.pmap.h));
        li = self.pmap.iFor(leftw(j,self.pmap.w),i);
        ri = self.pmap.iFor(rightw(j,self.pmap.w),i);

        ti = self.pmap.iFor(j,upw(i,self.pmap.h));
        bi = self.pmap.iFor(j,downw(i,self.pmap.h));
        li = self.pmap.iFor(leftw(j,self.pmap.w),i);
        ri = self.pmap.iFor(rightw(j,self.pmap.w),i);

        if(self.pmap.data[index] > 1) self.pmap.data[index] = 1;
        if(self.pmap.data[index] < 0) self.pmap.data[index] = 0;

        index++;
      }
    }

    self.pmap.anneal(0.2);

/*
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
        r  = self.pmap.sample((j+1+0.5)/self.vfield.w, (i  +0.5)/self.vfield.h);
        tr = self.pmap.sample((j+1+0.5)/self.vfield.w, (i-1+0.5)/self.vfield.h);
        t  = self.pmap.sample((j  +0.5)/self.vfield.w, (i-1+0.5)/self.vfield.h);
        tl = self.pmap.sample((j-1+0.5)/self.vfield.w, (i-1+0.5)/self.vfield.h);
        l  = self.pmap.sample((j-1+0.5)/self.vfield.w, (i  +0.5)/self.vfield.h);
        bl = self.pmap.sample((j-1+0.5)/self.vfield.w, (i+1+0.5)/self.vfield.h);
        b  = self.pmap.sample((j  +0.5)/self.vfield.w, (i+1+0.5)/self.vfield.h);
        br = self.pmap.sample((j+1+0.5)/self.vfield.w, (i+1+0.5)/self.vfield.h);

             if(r  <= tl && r  <= t && r  <= tr && r  <= r && r  <= br && r  <= b && r  <= bl && r  <= l) desiredtheta = Math.PI*1/4;
        else if(tr <= tl && tr <= t && tr <= tr && tr <= r && tr <= br && tr <= b && tr <= bl && tr <= l) desiredtheta = Math.PI*0/4;
        else if(t  <= tl && t  <= t && t  <= tr && t  <= r && t  <= br && t  <= b && t  <= bl && t  <= l) desiredtheta = Math.PI*7/4;
        else if(tl <= tl && tl <= t && tl <= tr && tl <= r && tl <= br && tl <= b && tl <= bl && tl <= l) desiredtheta = Math.PI*6/4;
        else if(l  <= tl && l  <= t && l  <= tr && l  <= r && l  <= br && l  <= b && l  <= bl && l  <= l) desiredtheta = Math.PI*5/4;
        else if(bl <= tl && bl <= t && bl <= tr && bl <= r && bl <= br && bl <= b && bl <= bl && bl <= l) desiredtheta = Math.PI*4/4;
        else if(b  <= tl && b  <= t && b  <= tr && b  <= r && b  <= br && b  <= b && b  <= bl && b  <= l) desiredtheta = Math.PI*3/4;
        else if(br <= tl && br <= t && br <= tr && br <= r && br <= br && br <= b && br <= bl && br <= l) desiredtheta = Math.PI*2/4;

        newtheta = lerp(theta,desiredtheta,0.01);
        self.vfield.data[index]   = Math.cos(newtheta)*10;
        self.vfield.data[index+1] = Math.sin(newtheta)*10;
      }
    }
*/

    self.dragger.flush();
    if(self.lpsys.dragging) self.hpsys.dragging = false;
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
    /*
    // height map
    */
    x_space = canv.canvas.width / self.pmap.w;
    y_space = canv.canvas.height / self.pmap.h;
    if(self.drawh)
    {
      for(var i = 0; i < self.pmap.h; i++)
      {
        for(var j = 0; j < self.pmap.w; j++)
        {
          y = y_space*i;
          x = x_space*j;
          index = self.pmap.iFor(j,i);
          var color = 255-Math.round(self.pmap.data[index]*255);
          canv.context.fillStyle = "rgba("+color+","+color+","+color+",1)";
          canv.context.fillRect(x,y,x_space+1,y_space+1);
          //canv.context.strokeStyle = "#ff0000";
          //canv.context.strokeRect(x,y,x_space,y_space);
        }
      }
    }

    var tl;
    var tr;
    var bl;
    var br;
    /*
    // contour lines
    */
    canv.context.strokeStyle = "#000000";
    if(self.drawc)
    {
      for(var l = 0; l < 1; l+=0.1)
      {
        for(var i = 0; i < self.pmap.h; i++)
        {
          for(var j = 0; j < self.pmap.w; j++)
          {
            y = y_space*i;
            x = x_space*j;
            tl = self.pmap.data[self.pmap.iFor(j  ,i  )] < l;
            tr = self.pmap.data[self.pmap.iFor(j+1,i  )] < l;
            bl = self.pmap.data[self.pmap.iFor(j  ,i+1)] < l;
            br = self.pmap.data[self.pmap.iFor(j+1,i+1)] < l;
            self.squareMarch(tl,tr,bl,br,x+x_space/2,y+y_space/2,x_space,y_space,canv);
          }
        }
      }
    }

    /*
    // vectors
    */
    if(self.drawv)
    {
      canv.context.fillStyle = "#555599";
      canv.context.strokeStyle = "#555599";
      x_space = canv.canvas.width / self.vfield.w;
      y_space = canv.canvas.height / self.vfield.h;
      for(var i = 0; i < self.vfield.h; i++)
      {
        for(var j = 0; j < self.vfield.w; j++)
        {
          y = y_space*i+(y_space/2);
          x = x_space*j+(x_space/2);
          index = self.vfield.iFor(j,i);
          canv.context.fillRect(x-0.5,y-0.5,1,1);
          //canv.drawLine(x,y,x+self.vfield.data[index],y+self.vfield.data[index+1]);
        }
      }
    }

    /*
    // pressure systems
    */
    if(self.drawp)
    {
      self.hpsys.draw(canv);
      self.lpsys.draw(canv);
    }
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

