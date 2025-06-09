import React from "react";
import Carousel from "../HomeCarousel/HomeCarousel";
import ImageThumb1 from "../../../assets/AboutUs/aboutus_pc1.png";
import ImageThumb2 from "../../../assets/AboutUs/aboutus_pc2.png";
import ImageThumb3 from "../../../assets/AboutUs/aboutus_pc3.png";
import "./AboutUs.css";

const Section = ({ imageFirst, image, title, children }) => (
  <div className="content">
    {imageFirst ? (
      <>
        <div className="content-image">
          {typeof image === "string" ? <img src={image} alt={title} /> : image}
        </div>
        <div className="content-text">
          <div className="text-title">{title}</div>
          <div className="text-content">{children}</div>
        </div>
      </>
    ) : (
      <>
        <div className="content-text">
          <div className="text-title">{title}</div>
          <div className="text-content">{children}</div>
        </div>
        <div className="content-image">
          {typeof image === "string" ? <img src={image} alt={title} /> : image}
        </div>
      </>
    )}
  </div>
);

const AboutUs = () => {
  return (
    <div className="container">
      <div className="part1">
        <Section imageFirst title="Why Open App Partner?" image={ImageThumb1}>
          At Open App Partners, we are passionate innovators determined to
          change the way technology serves individuals and businesses. Founded
          with the vision of empowering users through high-quality, innovative,
          and accessible applications, we develop solutions that tackle
          real-world problems, simplify complex tasks, and help people connect
          in meaningful ways. We are a team of passionate engineers, developers,
          and visionaries working collaboratively to bring the future of tech
          into the present, with an affordable applications platform.
        </Section>
      </div>

      <div className="part2">
        <div className="content">
          <div className="content-title">Our Vision</div>
          <div className="content-text">
            We envision a world where everyone has access to publishing
            applications, no matter how many team members they have, it should
            improve productivity and the lives of individual app developers,
            whether created from AI or individuals. By pushing the boundaries of
            artificial intelligence, cybersecurity, mental health support, and
            creative applications, we strive to make technology accessible and
            beneficial for all. Our goal is to build a suite of applications and
            platforms that empower individuals and businesses to unlock their
            potential and thrive in the digital age.
          </div>
        </div>
        <div>
          <Carousel />
        </div>
      </div>

      <div className="part3">
        <Section title="What We Do" image={ImageThumb2}>
          We specialize in developing and releasing a variety of innovative
          applications across multiple industries, publishing other applications
          no matter how many team members they have, unlike that large
          corporation. We have a highly advanced cybersecurity AI application,
          mental health, creative tools, and some game development. Our
          platform, Open App Partners, is designed to support developers and
          entrepreneurs by providing a flexible, open-source solution for
          launching and managing applications. Our solutions, from AI-powered
          mental health platforms, Dream Interpretation algorithm, and Blessings
          Random, which is the opposite of Random Nautica, to advanced 3D asset
          creation tools, reflect our commitment to creating high-quality,
          user-centric experiences that deliver real value.
        </Section>
      </div>

      <div className="part4">
        <Section imageFirst title="Our Approach" image={ImageThumb3}>
          At Open App Partners, our approach is user-focused, collaborative, and
          forward-thinking. We believe in creating high-level, functional, and
          accessible applications with precision and quality at the core. Every
          project we undertake starts with a deep understanding of user needs,
          industry trends, and future possibilities. Our development process is
          rooted in creativity, innovation, and attention to detail, ensuring
          that every app we release is fully functional, user-friendly, and
          ahead of the curve. We also prioritize collaboration with open-source
          communities and other developers to continuously push the boundaries
          of what’s possible.
        </Section>
      </div>
    </div>
  );
};

export default AboutUs;
