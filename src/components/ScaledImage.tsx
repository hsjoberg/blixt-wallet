import React from "react";
import { Image } from "react-native";

interface Props {
  uri: string;
  width?: number;
  height?: number;
  style?: any;
}

interface State {
  source: {};
  width: number;
  height: number;
}

export default class ScaledImage extends React.Component<Props, State> {
  constructor(props) {
    super(props);
    this.state = {
      source: { uri: this.props.uri },
      width: 0,
      height: 0,
    };
  }

  componentWillMount() {
    Image.getSize(
      this.props.uri,
      (width, height) => {
        if (this.props.width && !this.props.height) {
          this.setState({ width: this.props.width, height: height * (this.props.width / width) });
        } else if (!this.props.width && this.props.height) {
          this.setState({ width: width * (this.props.height / height), height: this.props.height });
        } else {
          this.setState({ width: width, height: height });
        }
      },
      (error) => {
        console.log("ScaledImage:componentWillMount:Image.getSize failed with error: ", error);
      },
    );
  }

  render() {
    return (
      <Image
        source={this.state.source}
        style={[this.props.style, { height: this.state.height, width: this.state.width }]}
      />
    );
  }
}
