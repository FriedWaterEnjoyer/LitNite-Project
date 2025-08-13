import express from "express";
import pg from "pg";
import axios from "axios";
import { dirname } from "path";
import { fileURLToPath } from "url";
import bodyParser from "body-parser";
import env from "dotenv";


const da_app = express();

const port = 3000;

const request_url = "https://covers.openlibrary.org/b/isbn/";

const da_db = new pg.Client({

  user: process.env.USER,
  host: process.env.HOST,
  database: process.env.DB,
  password: process.env.PASSWORD,
  port: process.env.PORT,

});

da_db.connect();


const __dirname = dirname(fileURLToPath(import.meta.url))


da_app.use(bodyParser.urlencoded({ extended: true }))
da_app.use(express.static(`${__dirname}/public`))



da_app.get("/", async (req, res) => {

  await da_db.query("CREATE TABLE IF NOT EXISTS books ( id serial primary key, book_name text NOT NULL UNIQUE, author text NOT NULL, star_rating float NOT NULL, review text NOT NULL, img_link text );")

  // Creating a "books" table if it doesn't exist in the database. If it does, then it'll fetch the data from the aforesaid table, bypassing the table creation part.

  let books_array = (await da_db.query("SELECT * FROM books")).rows

  
  res.render("index.ejs", { all_books: books_array })

})


da_app.get("/add", (req, res) => {

  res.render("add.ejs")

})


da_app.post("/add", async (req, res) => {


  let da_body = req.body

  try {

    const response = await axios.get(`${request_url}${da_body.isbn}.json`);

    const result = response.data;

    if (result.source_url === "null" || result.source_url === "") { // Checking whether or not the axios response returns in "null" or an empty string.

      // If so, then it's the same situation as with catching an error, only now it doesn't produce an error, it actually returns something.

      // Too bad that it's basically the same error as before. Then it's much more efficient to return the same "No Link".

      result.source_url = "No Link"

    }


    await da_db.query("INSERT INTO books (book_name, author, star_rating, review, img_link) VALUES ($1, $2, $3, $4, $5)",

      // No need to fill the "id" column, as it's already a "series" type object!!

      [da_body.book_name, da_body.author, da_body.rating, da_body.review, result.source_url]

    )

    res.redirect("/")

  } catch (error) { // The logic behind this is as follows: if an axios request results in "Request failed with status code 404" that means either of two things:

    // A - since i've put ISBN code as optional, then the user just never bothered typing the code in the first place, or

    // B - the user has typed an incorrect/invalid isbn code that failed to get the image's url.

    // Regardless of the outcome, it's better to pass in the image_link column "No Link".

    console.error("Failed to make request:", error.message);

        await da_db.query("INSERT INTO books (book_name, author, star_rating, review, img_link) VALUES ($1, $2, $3, $4, $5)",

        [da_body.book_name, da_body.author, da_body.rating, da_body.review, "No Link"]

    )


    res.redirect("/")

  }

})

da_app.post("/delete", async (req, res) => {

  let da_body = req.body

  await da_db.query("DELETE FROM books WHERE id = $1",

    [da_body.del_value]

  )

  return res.redirect("/")

})

da_app.post("/pre-edit", async (req, res) => {

  let da_body = req.body

  let da_edit_book = (await da_db.query("SELECT * FROM books WHERE id = $1",
    
    [da_body.edit_value]
  
  )).rows

  res.render("edit.ejs", { edit_book: da_edit_book })

})


da_app.post("/edit", async (req, res) => {

  let da_body = req.body

  try {

    const response = await axios.get(`${request_url}${da_body.isbn}.json`);

    const result = response.data;

    if (result.source_url === "null" || result.source_url === "") {


      result.source_url = "No Link"


    }


    await da_db.query("UPDATE books SET book_name = $1, author = $2, star_rating = $3, review = $4, img_link = $5 WHERE id = $6",

      [da_body.book_name, da_body.author, da_body.rating, da_body.review, result.source_url, da_body.id]

    )

    res.redirect("/")

  } catch (error) {

    console.error("Failed to make request:", error.message);

        await da_db.query("UPDATE books SET book_name = $1, author = $2, star_rating = $3, review = $4, img_link = $5 WHERE id = $6",

        [da_body.book_name, da_body.author, da_body.rating, da_body.review, "No Link", da_body.id]

    )


    res.redirect("/")

  }

})


da_app.get("/about", (req, res) => {

  res.render("about.ejs")

})


da_app.listen(port, () => {


  console.log(`The server is running on the localhost ${port}`)


})
