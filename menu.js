/**
 * CS171 Final Project - What does SEX look like?
 * Lucas Freitas, Vivian Leung, Charlie Lovett
 */

var menu = d3.select("#menu");

// add caption
var caption = menu.append("h2")
       .attr("id", "menu-caption");

// caption attributes
var captionText = [];

// add form
var form = menu.append("form");

// tag categories
var categories = [{id: "sh", name: "sexual health", children: ["cly", "syp", "hiv", "gon"]},
                  {id: "sb", name: "social behavior", children: ["teen", "gdp", "pop"]},
                  {id: "porn", name: "pornography usage", children: ["creampie", "teen-tag"]}];

// possible tags
var tags = [{id: "cly", name: "chlamydia"},
            {id: "syp", name: "syphilis"},
            {id: "hiv", name: "HIV"},
            {id: "gon", name: "gonorrhea"},
            {id: "teen", name: "teen pregnancy"},
            {id: "gdp", name: "GDP"},
            {id: "pop", name: "population density"},
            {id: "creampie", name: "teen tag"},
            {id: "teen-tag", name: "creampie tag"}];

var currentCategory = null;

// update form with form's children
function updateForm(array) {
  // remove all (possible) nodes in form
  form.remove();

  // add form
  form = menu.append("form");

  // if already selected, add back button
  if(captionText.length > 0) {
    var backButton = form.append("i");
    backButton
      .attr("class", "fa fa-arrow-left")
      .on("click", function() {
        // remove last tag
        captionText.pop();
        updateForm(categories);
      });
  }

  // generate buttons
  buttons = form.selectAll("input")
         .data(array)
         .enter()
         .append("input")
         .attr("type", "radio")
         .attr("id", function(d, i) {
            return "radio" + (i + 1);
         })
         .attr("name", "radios")
         .attr("value", function(d) {
            return d.id;
         });

  // add labels
  var labels = form.selectAll("input").each(function(d, i) {
      var label = document.createElement("label");
      label.setAttribute("for", "radio" + (i + 1));
      label.innerHTML = array[i].name;
      this.parentNode.insertBefore(label, this.nextSibling);
  });

  // update caption text
  if(captionText.length > 0) {
    text = "compare";
    captionText.forEach(function(d, i) {
      text += " " + d.name;
      // format punctuation and grammar
      if(i == captionText.length - 1 && captionText.length < 3) {
        text += " and..."
      }

      else if(i < captionText.length - 1 && !(i == 1 && captionText.length == 3)){
        text += ", ";
      }

      else if(i == 1 && captionText.length == 3) {
        text += " and ";
      }
    });

    caption.text(text);
  }

  else if(currentCategory){
    caption.text("show me " + currentCategory + " data on...");
  }

  else {
    caption.text("show me data from...");
  }

  // set radio button toggle for first selection
  array.forEach(function(d, i) {
    d3.select("input[value=\"" + d.id + "\"]").
      on("click", function() {
        // go into category
        if(d.children) {
          currentCategory = d.name;
          updateForm(tags.filter(function(el, j) {
            return (d.children.indexOf(el.id) > -1) && (captionText.indexOf(el) < 0);
          }));
        }

        // add element to caption and return to categories
        else {
          currentCategory = null;
          // add category to caption
          captionText.push(d);
          console.log(d.id);
          loadFactor(d.id);
          //updateForm(categories);
        }
      });
  });
}

updateForm(categories);

/*<form>

// set radio button toggle for first selection
categories.forEach(function(d, i) {
  d3.select("input[value=\"" + d.id + "\"]").
    on("click", function() {
      loadFactor(d.id);
      captionText.push(d.name);
    });
});

  <p>show me data from...</p>
  <input type="radio" id="radio1" name="radios" value="cly">
    <label for="radio1">Chlamydia</label>
  <input type="radio" id="radio2" name="radios" value="gon">
    <label for="radio2">Gonorrhea</label>
  <input type="radio" id="radio3" name="radios" value="teen">
    <label for="radio3">Teen Pregnancy Rates</label>
  <input type="radio" id="radio4" name="radios" value="creampie">
    <label for="radio4">"Creampie" tag</label>
  <input type="radio" id="radio5" name="radios" value="teen-tag">
    <label for="radio5">"Teen" tag"</label>
  <input type="radio" id="radio6" name="radios" value="syp">
    <label for="radio6">Syphilis</label>
</form>*/