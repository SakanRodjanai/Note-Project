import express from "express";
import bodyParser from "body-parser";
import pg from "pg";

const db = new pg.Client({
  user: "postgres",
  host: "localhost",
  database: "review",
  password: "1",
  port: "5432",
});

const app = express();
const port = 3000;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

// Connect to the database
db.connect();

// Set up the view engine
app.set("view engine", "ejs");
app.set("views", "./views");

app.get("/", async (req, res) => {
  try {
    const result = await db.query(
      "SELECT animals.id AS animal_id, animals.name AS animal_name, comment.comment_text, comment.rating " +
        "FROM animals LEFT JOIN comment ON animals.id = comment.animal_id ORDER BY animals.id ASC"
    );
    const animalsWithComments = result.rows;

    res.render("index.ejs", {
      listAnimalsWithComments: animalsWithComments,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
});

app.post("/add", async (req, res) => {
  const { newAnimal, newComment, newRating } = req.body;
  try {
    // Insert into the animals table
    const animalResult = await db.query(
      "INSERT INTO animals (name) VALUES ($1) RETURNING id",
      [newAnimal]
    );
    const animalId = animalResult.rows[0].id;

    // Insert into the comment table
    await db.query(
      "INSERT INTO comment (animal_id, comment_text, rating) VALUES ($1, $2, $3)",
      [animalId, newComment, newRating]
    );

    res.redirect("/");
  } catch (err) {
    console.error(err);
    res.status(500).send("Error adding new animal and comment");
  }
});

app.post("/edit", async (req, res) => {
  const id = req.body.updatedItemId; // รับ ID ของสัตว์ที่ต้องการแก้ไข
  const animalName = req.body.updatedAnimalName;
  const commentText = req.body.updatedComment;
  const rating = req.body.updatedRating;

  try {
    // อัปเดตข้อมูลในตาราง
    await db.query("UPDATE animals SET name = $1 WHERE id = $2", [
      animalName,
      id,
    ]);

    await db.query(
      "UPDATE comment SET comment_text = $1, rating = $2 WHERE animal_id = $3",
      [commentText, rating, id]
    );

    res.redirect("/"); // กลับไปหน้าแรกหลังแก้ไขเสร็จ
  } catch (err) {
    console.log(err);
    res.status(500).send("Error updating item.");
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
