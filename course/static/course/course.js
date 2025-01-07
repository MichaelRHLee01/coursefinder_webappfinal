function toggleForm() {
    var formContainer = document.getElementById("add-course-form-container");
    if (formContainer.style.display === "none" || formContainer.style.display === "") {
        formContainer.style.display = "block";
    } else {
        formContainer.style.display = "none";
    }
}

function addCourse(event) {
    event.preventDefault();
    let courseNumber = document.getElementById("course_number").value;
    let courseName = document.getElementById("course_name").value;
    let hoursPerWeek = document.getElementById("hours_per_week").value;

    if (!/^\d{5}$/.test(courseNumber)) {
        alert("Please enter exactly 5 digits for course number");
        return;
    }

    let xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function () {
        if (this.readyState !== 4) return;
        if (xhr.status === 200) {
            updatePage(xhr);
            document.getElementById("add-course-form").reset();  // Clear form
            document.getElementById("add-course-form-container").style.display = "none";  // Hide form
        } else {
            console.error("Error adding course:", xhr.status);
        }
    };

    let csrfToken = getCSRFToken();
    xhr.open("POST", "/course/add-course", true);
    xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");

    let postData = `csrfmiddlewaretoken=${csrfToken}&course_number=${encodeURIComponent(courseNumber)}&course_name=${encodeURIComponent(courseName)}&hours_per_week=${encodeURIComponent(hoursPerWeek)}`;
    xhr.send(postData);
}

function updatePage(xhr) {
    if (xhr.status === 200) {
        let response = JSON.parse(xhr.responseText);

        if (response.hasOwnProperty('error')) {
            displayError(response.error);
            return;
        }

        updateCourse(response);
        return;
    }

    if (xhr.status === 0) {
        displayError("Cannot connect to server");
        return;
    }

    if (!xhr.getResponseHeader('content-type') === 'application/json') {
        displayError(`Received status = ${xhr.status}`);
        return;
    }
}

function updateCourse(items) {
    let courseContainer = document.getElementById("my-posts-go-here");

    Array.from(items).forEach(item => {
        if (document.getElementById(`id_course_div_${item.id}`) == null) {
            courseContainer.appendChild(makeCourseElement(item));
        }
    });
}

function makeCourseElement(course) {
    let courseDiv = document.createElement("div");
    courseDiv.className = "course-card";
    courseDiv.id = `course_${course.id}`;

    const isAdmin = document.body.dataset.isStaff === 'true';

    courseDiv.innerHTML = `
        <h3>${course.number}: ${course.name}</h3>
        <p class="credit-hours">${course.average_credit_hours} units</p>
        <p>
            <span class="dropdown-arrow" data-course-id="${course.id}" 
                onclick="toggleRatingDropdown('${course.id}', this)">
                ▼
            </span>
            Average Rating: <span id="avg_rating_${course.id}">0 hrs/wk</span>
        </p>
        <div class="chart" id="rating-chart-container-${course.id}" style="display: none;">
            <canvas id="rating-chart-${course.id}"></canvas>
        </div>
            <form onsubmit="submitVote(event)" data-course-id="${course.id}">
                <label for="rating_${course.id}">Add Rating: </label>
                <input type="number" id="rating_${course.id}" name="rating" min="1" max="25" required>
                <button type="submit">Submit</button>
        </form>
        ${isAdmin ? `
            <div class="admin-controls">
                <button onclick="deleteCourse('${course.id}')">Delete Course</button>
                <div class="vote-list"></div>
            </div>
        ` : ''}
    `;

    return courseDiv;


}


function getCSRFToken() {
    let cookies = document.cookie.split(";")
    for (let i = 0; i < cookies.length; i++) {
        let c = cookies[i].trim()
        if (c.startsWith("csrftoken=")) {
            return c.substring("csrftoken=".length, c.length)
        }
    }
    return "unknown"
}

function sanitize(s) {
    return s.replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
}

function submitVote(event) {
    event.preventDefault();

    let form = event.target;
    let courseId = form.getAttribute("data-course-id");

    let ratingInput = document.getElementById(`rating_${courseId}`);
    let ratingValue = ratingInput.value;

    let xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function () {
        if (this.readyState !== 4) return;
        if (xhr.status === 200) {
            let response = JSON.parse(xhr.responseText);
            document.getElementById(`avg_rating_${response.course_id}`).innerText = `${response.average_rating} hrs/wk`;

            resortCourses();

            ratingInput.value = '';

        } else {
            console.error("Failed to submit rating.");
        }
    };

    let csrfToken = getCSRFToken();
    xhr.open("POST", "/course/submit-vote", true);
    xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");

    let postData = `csrfmiddlewaretoken=${csrfToken}&course_id=${courseId}&rating=${encodeURIComponent(ratingValue)}`;
    xhr.send(postData);
}

function resortCourses() {
    let courseContainer = document.getElementById("my-posts-go-here");
    let courses = Array.from(courseContainer.getElementsByClassName("course-card"));

    let zeroCourses = courses.filter(course => {
        let rating = parseFloat(course.querySelector('[id^="avg_rating_"]').innerText) || 0;
        return rating === 0;
    });

    let nonZeroCourses = courses.filter(course => {
        let rating = parseFloat(course.querySelector('[id^="avg_rating_"]').innerText) || 0;
        return rating > 0;
    });

    nonZeroCourses.sort((a, b) => {
        let aRating = parseFloat(a.querySelector('[id^="avg_rating_"]').innerText) || 0;
        let bRating = parseFloat(b.querySelector('[id^="avg_rating_"]').innerText) || 0;
        return aRating - bRating;
    });

    courseContainer.innerHTML = '';
    nonZeroCourses.forEach(course => courseContainer.appendChild(course));
    zeroCourses.forEach(course => courseContainer.appendChild(course));

}


function loadRatingDistribution(courseId, chartContainer, canvas) {
    fetch(`/course/${courseId}/rating-distribution/`)
        .then(response => response.json())
        .then(data => {
            const labels = Object.keys(data);
            const values = Object.values(data);

            const ctx = canvas.getContext('2d');

            if (canvas.chartInstance) {
                canvas.chartInstance.destroy();
            }

            canvas.chartInstance = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Number of Ratings per Hour Range',
                        data: values,
                        backgroundColor: 'rgba(54, 162, 235, 0.2)',
                        borderColor: 'rgba(54, 162, 235, 1)',
                        borderWidth: 1
                    }]
                },
                options: {
                    scales: {
                        y: {
                            beginAtZero: true
                        }
                    }
                }
            });

            chartContainer.style.display = 'block';
        });
}

function toggleRatingDropdown(courseId, arrowElement) {
    const chartContainer = document.getElementById(`rating-chart-container-${courseId}`);
    const canvas = document.getElementById(`rating-chart-${courseId}`);

    if (chartContainer.style.display === 'none' || chartContainer.style.display === '') {
        loadRatingDistribution(courseId, chartContainer, canvas);
        chartContainer.style.display = 'block';
        arrowElement.classList.add('open');
    } else {
        chartContainer.style.display = 'none';
        arrowElement.classList.remove('open');
    }
}

document.addEventListener("DOMContentLoaded", function () {
    document.querySelectorAll(".show-ratings-button").forEach(button => {
        button.addEventListener("click", function () {
            const courseId = this.getAttribute("data-course-id");
            loadRatingDistribution(courseId, this);
        });
    });
});

function deleteCourse(courseId) {
    if (!confirm("Are you sure you want to delete this course?")) return;

    let xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function () {
        if (this.readyState === 4 && this.status === 200) {
            document.getElementById(`course_${courseId}`).remove();
        }
    };

    let csrfToken = getCSRFToken();
    xhr.open("POST", `/course/${courseId}/delete/`, true);
    xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
    xhr.send(`csrfmiddlewaretoken=${csrfToken}`);
}

function deleteVote(voteId) {
    if (!confirm("Are you sure you want to delete this vote?")) return;

    let xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function () {
        if (this.readyState === 4 && this.status === 200) {
            let response = JSON.parse(xhr.responseText);
            document.getElementById(`vote_${voteId}`).remove();
            document.getElementById(`avg_rating_${response.course_id}`).innerText = response.average_rating;
        }
    };

    let csrfToken = getCSRFToken();
    xhr.open("POST", `/vote/${voteId}/delete/`, true);
    xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
    xhr.send(`csrfmiddlewaretoken=${csrfToken}`);
}