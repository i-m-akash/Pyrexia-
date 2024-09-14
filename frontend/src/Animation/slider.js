import React from "react";
import Slider from "react-slick";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import "./slider.css"; // Create this file for custom styles
import Alfresco from "../Images/Alfresco.png";
import Kalakriti from "../Images/Kalakriti.png";
import Littmania from "../Images/Littmania.png";
import Solasta from "../Images/Solasta.png";
import Thunderbolt from "../Images/Thunderbolt.png";

const Slider1 = () => {
  const images = [
   Alfresco,Kalakriti,Littmania,Solasta,Thunderbolt
  ];
  const settings = {    
    dots: true,
    infinite: true,
    speed: 500,
    slidesToShow: 1,
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 2000,
    cssEase: "linear",
  };

  return (
    <div className="image-slider">
      <Slider {...settings}>
        {images.map((image, index) => (
    
          <div key={index}>

            <img src={image} className='w-80 h-auto'alt={`Slide ${index}`} />
          </div>
        ))}
        
      </Slider>
    </div>
  );
};

export default Slider1;