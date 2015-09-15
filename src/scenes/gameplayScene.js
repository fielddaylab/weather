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
    var dm = self.dir_map;
    self.dir_map.sample = function(x,y) //overwrite to slerp (er, 'clerp'...)
    {
      var self = dm;
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

           if(tl > tr && tl-tr > tr-(tl-Math.PI*2)) tl -= Math.PI*2;
      else if(tr > tl && tr-tl > (tl+Math.PI*2)-tr) tl += Math.PI*2;

      var t = (lerp(tr,tl,(x+.5)%1))%(Math.PI*2);

           if(bl > br && bl-br > br-(bl-Math.PI*2)) bl -= Math.PI*2;
      else if(br > bl && br-bl > (bl+Math.PI*2)-br) bl += Math.PI*2;

      var b = (lerp(br,bl,(x+.5)%1))%(Math.PI*2);

           if(b > t && b-t > t-(b-Math.PI*2)) b -= Math.PI*2;
      else if(t > b && t-b > (b+Math.PI*2)-t) b += Math.PI*2;

      return (lerp(t,b,(y+.5)%1))%(Math.PI*2);
    }
    self.len_map = new HeightMap(w,h);
    for(var i = 0; i < w*h; i++)
    {
      self.dir_map.data[i] = Math.random()*2*Math.PI;
      self.len_map.data[i] = Math.random();
    }

    self.iFor = self.dir_map.iFor;
  }
  var Air = function(n)
  {
    var self = this;
    self.partxs = [];
    self.partys = [];
    self.partts = [];
    self.n = n;
    for(var i = 0; i < self.n; i++)
    {
      self.partxs[i] = Math.random();
      self.partys[i] = Math.random();
      self.partts[i] = Math.random();
    }
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
      //canv.context.strokeRect(self.x,self.y,self.w,self.h);
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
  self.air;

  self.drawh = true;
  self.drawc = true;
  self.drawv = true;
  self.drawp = true;
  self.drawa = true;

  self.ready = function()
  {
    var cells_w = 50;
    var cells_h = 50;

    stage.drawCanv.context.font = "30px arial";
    self.dragger = new Dragger({source:stage.dispCanv.canvas});

    self.tmap = new HeightMap(cells_w,cells_h);
    self.pmap = new HeightMap(cells_w,cells_h);
    self.vfield = new VecField2d(25,25);
    self.air = new Air(10000);

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

    //calculate wind
    for(var i = 0; i < self.vfield.h; i++)
    {
      for(var j = 0; j < self.vfield.w; j++)
      {
        var lowest_t = 0;  var lowest_p = 1;
        var highest_t = 0; var highest_p = 0;
        var x = (j+0.5)/self.vfield.w;
        var y = (i+0.5)/self.vfield.h;
        var d = 0.05;
        var p = 0;
        for(var t = 0; t < Math.PI*2; t += 0.1)
        {
          p = self.pmap.sample(x+Math.cos(t)*d,y+Math.sin(t)*d);
          if(p < lowest_p)  { lowest_t  = t; lowest_p  = p; }
          if(p > highest_p) { highest_t = t; highest_p = p; }
        }

        var index = self.vfield.iFor(j,i);
        theta = self.vfield.dir_map.data[index];

        var t = lerp(lowest_t,highest_t,0.5);
        var lx = Math.cos(lowest_t);
        var ly = Math.sin(lowest_t);
        var x = Math.cos(t);
        var y = Math.sin(t);
        if((-lx)*(y-ly) - (-ly)*(x-lx) > 0) t = (t+Math.PI)%(2*Math.PI);

             if(t > theta && t-theta > theta-(t-Math.PI*2)) t -= Math.PI*2;
        else if(theta > t && theta-t > (t+Math.PI*2)-theta) t += Math.PI*2;

        self.vfield.dir_map.data[index] = lerp(theta,t,0.1)%(Math.PI*2);
        self.vfield.len_map.data[index] = Math.abs(highest_p-lowest_p)*(1-lowest_p)*5;
      }
    }

    //update parts
    var dir;
    var len;
    for(var i = 0; i < self.air.n; i++)
    {
      self.air.partts[i] -= 0.01;
      if(self.air.partts[i] <= 0)
      {
        self.air.partts[i] = 1;
        self.air.partxs[i] = Math.random();
        self.air.partys[i] = Math.random();
      }
      else
      {
        dir = self.vfield.dir_map.sample(self.air.partxs[i],self.air.partys[i]);
        len = self.vfield.len_map.sample(self.air.partxs[i],self.air.partys[i]);
        self.air.partxs[i] += Math.cos(dir)*len/100 + ((Math.random()-0.5)/200);
        self.air.partys[i] += Math.sin(dir)*len/100 + ((Math.random()-0.5)/200);
        if(self.air.partxs[i] < 0 || self.air.partxs[i] > 1) self.air.partts[i] = 0;
        if(self.air.partys[i] < 0 || self.air.partys[i] > 1) self.air.partts[i] = 0;
      }
    }

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

    /*
    // air
    */
    if(self.drawa)
    {
      canv.context.fillStyle = "#FFFFFF";
      for(var i = 0; i < self.air.n; i++)
        canv.context.fillRect(self.air.partxs[i]*canv.canvas.width-1,self.air.partys[i]*canv.canvas.height-1,2,2);
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
      canv.context.strokeStyle = "#0000FF";
      x_space = canv.canvas.width / self.vfield.w;
      y_space = canv.canvas.height / self.vfield.h;
      for(var i = 0; i < self.vfield.h; i++)
      {
        for(var j = 0; j < self.vfield.w; j++)
        {
          y = y_space*i+(y_space/2);
          x = x_space*j+(x_space/2);
          index = self.vfield.iFor(j,i);
          canv.context.fillRect(x-1,y-1,2,2);
          canv.drawLine(x,y,x+Math.cos(self.vfield.dir_map.data[index])*self.vfield.len_map.data[index]*10,y+Math.sin(self.vfield.dir_map.data[index])*self.vfield.len_map.data[index]*10);
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

